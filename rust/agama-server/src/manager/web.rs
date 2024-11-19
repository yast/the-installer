// Copyright (c) [2024] SUSE LLC
//
// All Rights Reserved.
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, contact SUSE LLC.
//
// To contact SUSE LLC about this file by physical or electronic mail, you may
// find current contact information at www.suse.com.

//! This module implements the web API for the manager service.
//!
//! The module offers two public functions:
//!
//! * `manager_service` which returns the Axum service.
//! * `manager_stream` which offers an stream that emits the manager events coming from D-Bus.

use super::backend::ManagerServiceClient;
use crate::{error::Error, web::Event};
use agama_lib::{
    logs,
    manager::{InstallationPhase, InstallerStatus},
    proxies::Manager1Proxy,
};
use axum::{
    body::Body,
    extract::State,
    http::{header, status::StatusCode, HeaderMap, HeaderValue},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use std::pin::Pin;
use tokio_stream::{Stream, StreamExt};
use tokio_util::io::ReaderStream;

#[derive(Clone)]
pub struct ManagerState {
    backend: ManagerServiceClient,
}

/// Returns a stream that emits manager related events coming from D-Bus.
///
/// It emits the Event::InstallationPhaseChanged event.
///
/// * `connection`: D-Bus connection to listen for events.
pub async fn manager_stream(
    dbus: zbus::Connection,
) -> Result<Pin<Box<dyn Stream<Item = Event> + Send>>, Error> {
    let proxy = Manager1Proxy::new(&dbus).await?;
    let stream = proxy
        .receive_current_installation_phase_changed()
        .await
        .then(|change| async move {
            if let Ok(phase) = change.get().await {
                match InstallationPhase::try_from(phase) {
                    Ok(phase) => Some(Event::InstallationPhaseChanged { phase }),
                    Err(error) => {
                        log::warn!("Ignoring the installation phase change. Error: {}", error);
                        None
                    }
                }
            } else {
                None
            }
        })
        .filter_map(|e| e);
    Ok(Box::pin(stream))
}

pub fn manager_router(client: ManagerServiceClient) -> Router {
    let state = ManagerState { backend: client };
    Router::new()
        .route("/probe", post(probe_action))
        .route("/probe_sync", post(probe_sync_action))
        .route("/install", post(install_action))
        .route("/finish", post(finish_action))
        .route("/installer", get(installer_status))
        .nest("/logs", logs_router())
        .with_state(state)
}

/// Starts the probing process.
// The Probe D-Bus method is blocking and will not return until the probing is finished. To avoid a
// long-lived HTTP connection, this method returns immediately (with a 200) and runs the request on
// a separate task.
#[utoipa::path(
    post,
    path = "/probe",
    context_path = "/api/manager",
    responses(
      (
          status = 200,
          description = "The probing was requested but there is no way to know whether it succeeded."
       )
    )
)]
async fn probe_action(State(state): State<ManagerState>) -> Result<(), Error> {
    let client = state.backend.clone();
    tokio::spawn(async move {
        if let Err(error) = client.probe().await {
            tracing::error!("Could not start probing: {:?}", error);
        }
    });
    Ok(())
}

/// Starts the probing process and waits until it is done.
/// We need this because the CLI (agama_lib::Store) only does sync calls.
#[utoipa::path(
    post,
    path = "/probe_sync",
    context_path = "/api/manager",
    responses(
      (status = 200, description = "Probing done.")
    )
)]
async fn probe_sync_action(State(state): State<ManagerState>) -> Result<(), Error> {
    state.backend.probe().await.unwrap();
    Ok(())
}

/// Starts the installation process.
#[utoipa::path(
    post,
    path = "/install",
    context_path = "/api/manager",
    responses(
      (status = 200, description = "The installation process was started.")
    )
)]
async fn install_action(State(state): State<ManagerState>) -> Result<(), Error> {
    state.backend.commit().await.unwrap();
    Ok(())
}

/// Executes the post installation tasks (e.g., rebooting the system).
#[utoipa::path(
    post,
    path = "/install",
    context_path = "/api/manager",
    responses(
      (status = 200, description = "The installation tasks are executed.")
    )
)]
async fn finish_action(State(state): State<ManagerState>) -> Result<(), Error> {
    state.backend.finish().await.unwrap();
    Ok(())
}

/// Returns the manager status.
#[utoipa::path(
    get,
    path = "/installer",
    context_path = "/api/manager",
    responses(
      (status = 200, description = "Installation status.", body = InstallerStatus)
    )
)]
async fn installer_status(
    State(state): State<ManagerState>,
) -> Result<Json<InstallerStatus>, Error> {
    let status = state.backend.get_state().await.unwrap();
    Ok(Json(status))
}

/// Creates router for handling /logs/* endpoints
fn logs_router() -> Router<ManagerState> {
    Router::new()
        .route("/store", get(download_logs))
        .route("/list", get(list_logs))
}

#[utoipa::path(get,
    path = "/logs/store",
    context_path = "/api/manager",
    responses(
        (status = 200, description = "Compressed Agama logs", content_type="application/octet-stream"),
        (status = 500, description = "Cannot collect the logs"),
        (status = 507, description = "Server is probably out of space"),
    )
)]
async fn download_logs() -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    let err_response = (headers.clone(), Body::empty());

    match logs::store() {
        Ok(path) => {
            if let Ok(file) = tokio::fs::File::open(path.clone()).await {
                let stream = ReaderStream::new(file);
                let body = Body::from_stream(stream);
                let _ = std::fs::remove_file(path.clone());

                // See RFC2046, RFC2616 and
                // https://www.iana.org/assignments/media-types/media-types.xhtml
                // or /etc/mime.types
                headers.insert(
                    header::CONTENT_TYPE,
                    HeaderValue::from_static("application/x-compressed-tar"),
                );
                headers.insert(
                    header::CONTENT_DISPOSITION,
                    HeaderValue::from_static("attachment; filename=\"agama-logs\""),
                );
                headers.insert(
                    header::CONTENT_ENCODING,
                    HeaderValue::from_static(logs::DEFAULT_COMPRESSION.1),
                );

                (StatusCode::OK, (headers, body))
            } else {
                (StatusCode::INSUFFICIENT_STORAGE, err_response)
            }
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, err_response),
    }
}

#[utoipa::path(get,
    path = "/logs/list",
    context_path = "/api/manager",
    responses(
        (status = 200, description = "Lists of collected logs", body = logs::LogsLists)
    )
)]
pub async fn list_logs() -> Json<logs::LogsLists> {
    Json(logs::list())
}
