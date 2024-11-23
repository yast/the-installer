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

//! Implements the logic for the manager service.
//!
//! This service is the responsible for orchestrating the installation process. It may execute YaST2
//! clients or call to other services through D-Bus or HTTP.
//!
//! To improve responsiveness, the service uses Tokio's tasks to runs long-running operations in the
//! background (e.g., the probing phase). However, only one of those tasks can run at a time. It
//! works in this way by design, not because of a technical limitation.
//!
//! The service coordinates and shares the state where needed using a message passing channels. The
//! interaction with the service is done through the [ManagerServiceClient] struct which hides the
//! details of passing messages, offering a simpler interface.
mod client;
mod server;

use crate::{products::ProductsRegistry, service_status::ServiceStatusError, web::EventsSender};
use agama_lib::{
    base_http_client::{BaseHTTPClient, BaseHTTPClientError},
    manager::InstallationPhase,
};
pub use client::ManagerServiceClient;
pub use server::ManagerServiceServer;
use server::{HTTPClients, ManagerAction};
use tokio::sync::{mpsc, oneshot};

pub type ManagerActionSender = mpsc::UnboundedSender<ManagerAction>;
pub type ManagerActionReceiver = mpsc::UnboundedReceiver<ManagerAction>;

#[derive(thiserror::Error, Debug)]
pub enum ManagerError {
    #[error("HTTP client error: {0}")]
    HTTPClient(#[from] BaseHTTPClientError),
    #[error("Could not send the action to the service: {0}")]
    Send(#[from] mpsc::error::SendError<ManagerAction>),
    #[error("Could not receive the result: {0}")]
    RecvResult(#[from] oneshot::error::RecvError),
    #[error("Could not send the result")]
    SendResult,
    #[error("Could not join the background task: {0}")]
    Join(#[from] tokio::task::JoinError),
    #[error("The service task is busy")]
    Busy,
    #[error("Service status error: {0}")]
    ServiceStatus(#[from] ServiceStatusError),
}

/// Builds and starts the manager service.
///
/// ```no_run
/// # use tokio_test;
/// use agama_server::{
///   manager::backend::ManagerService,
///   products::ProductsRegistry, web::{EventsSender, Event}
/// };
/// use agama_lib::base_http_client::BaseHTTPClient;
/// use tokio::sync::broadcast;
///
/// # tokio_test::block_on(async {
/// let (events_tx, _events_rx) = broadcast::channel::<Event>(16);
/// let http = BaseHTTPClient::default();
/// let products = ProductsRegistry::load().unwrap();
/// let client = ManagerService::start(products, http, events_tx).await;
///
/// client.probe().await.unwrap(); // Start probing.
/// # });
/// ```
pub struct ManagerService {}

impl ManagerService {
    /// Starts the manager service.
    pub async fn start(
        products: ProductsRegistry,
        http: BaseHTTPClient,
        events: EventsSender,
    ) -> ManagerServiceClient {
        let (tx, rx) = mpsc::unbounded_channel();

        let server = ManagerServiceServer {
            recv: rx,
            sender: tx,
            events,
            products,
            phase: InstallationPhase::Startup,
            http_clients: HTTPClients::new(http),
        };

        // TODO: run the startup if there is a single product. Actually, the products registry is not needed for the manager service later.
        server.start().await
    }
}
