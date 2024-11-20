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

use crate::products::ProductsRegistry;
use crate::services::{InstallerService, ServiceStatusManager};
use crate::web::{Event, EventsSender};
use agama_lib::progress::ProgressSummary;
use agama_lib::{
    base_http_client::BaseHTTPClient,
    manager::{InstallationPhase, InstallerStatus},
    software::SoftwareHTTPClient,
    storage::http_client::StorageHTTPClient,
};
use std::sync::{Arc, Mutex};
use tokio::sync::{mpsc, oneshot};

use super::ManagerError;

pub type ManagerActionSender = mpsc::UnboundedSender<ManagerAction>;
pub type ManagerActionReceiver = mpsc::UnboundedReceiver<ManagerAction>;

const SERVICE_NAME: &str = "org.opensuse.Agama.Manager1";

/// Actions that the manager service can perform.
#[derive(Debug)]
pub enum ManagerAction {
    /// Performs a probe.
    Probe,
    /// Starts the installation.
    Commit,
    /// Finishes the installation.
    Finish,
    /// Returns the installation status.
    GetState(oneshot::Sender<InstallerStatus>),
    /// Returns the current progress.
    GetProgress(oneshot::Sender<Option<ProgressSummary>>),
}

#[derive(Clone)]
struct ManagerState {
    services: Services,
    phase: InstallationPhase,
}

/// Main service for the installation process.
///
/// It is responsible for orchestrating the installation process. It may execute YaST2 clients or
/// call to other services through D-Bus or HTTP.
pub struct ManagerService {
    progress: Arc<Mutex<ServiceStatusManager>>,
    recv: mpsc::UnboundedReceiver<ManagerAction>,
    sender: mpsc::UnboundedSender<ManagerAction>,
    events: EventsSender,
    products: ProductsRegistry,
    manager_state: ManagerState,
}

impl ManagerService {
    pub fn new(products: ProductsRegistry, http: BaseHTTPClient, events: EventsSender) -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        let progress = ServiceStatusManager::new(SERVICE_NAME, events.clone());

        let state = ManagerState {
            phase: InstallationPhase::Startup,
            services: Services::new(http),
        };

        Self {
            recv: rx,
            sender: tx,
            products,
            events,
            progress: Arc::new(Mutex::new(progress)),
            manager_state: state,
        }
    }

    pub fn input(&self) -> mpsc::UnboundedSender<ManagerAction> {
        self.sender.clone()
    }

    pub async fn startup(&mut self) -> Result<(), ManagerError> {
        tracing::info!("Starting the manager service");

        if !self.products.is_multiproduct() {
            // TODO: autoselect the product
            self.probe().await?;
        }

        Ok(())
    }

    pub async fn probe(&mut self) -> Result<(), ManagerError> {
        tracing::info!("Probing the system");
        let steps = vec!["Analyze disks", "Configure software"];
        // TODO: change the phase in the call to "run_in_background", when we are sure the
        // service is not blocked.
        self.change_phase(InstallationPhase::Config);

        self.run_in_background(|_events, progress, state| async move {
            {
                // TODO: implement a macro for this
                let mut progress_manager = progress.lock().unwrap();
                progress_manager.start(steps.as_slice());
            }
            state.services.software.probe().await?;
            {
                let mut progress_manager = progress.lock().unwrap();
                progress_manager.next();
            }
            state.services.storage.probe().await?;
            {
                progress.lock().unwrap().finish();
            }
            Ok(())
        });

        Ok(())
    }

    pub async fn commit(&mut self) -> Result<(), ManagerError> {
        todo!()
    }

    pub async fn finish(&mut self) -> Result<(), ManagerError> {
        todo!()
    }

    pub async fn get_state(
        &self,
        tx: oneshot::Sender<InstallerStatus>,
    ) -> Result<(), ManagerError> {
        let progress = self.progress.lock().unwrap();
        let status = InstallerStatus {
            is_busy: progress.is_busy(),
            // TODO: implement use_iguana and can_install
            can_install: false,
            use_iguana: false,
            phase: self.manager_state.phase,
        };
        tx.send(status).map_err(|_| ManagerError::SendResult)
    }

    /// Starts the manager loop and returns a client.
    ///
    /// The manager receives actions requests from the client using a channel.
    pub async fn listen(mut self) -> ManagerServiceClient {
        let client = ManagerServiceClient {
            actions: self.sender.clone(),
        };

        tokio::spawn(async move {
            self.run().await;
        });

        client
    }

    async fn run(&mut self) {
        loop {
            let action = self.recv.recv().await;
            tracing::info!("manager dispatching action: {:?}", &action);
            let Some(action) = action else {
                tracing::error!("Manager action channel closed");
                break;
            };

            if let Err(error) = self.dispatch(action).await {
                tracing::error!("Manager dispatch error: {error}");
                // Send the message back.
            }
        }
    }

    async fn dispatch(&mut self, action: ManagerAction) -> Result<(), ManagerError> {
        match action {
            ManagerAction::Probe => {
                self.probe().await?;
            }

            ManagerAction::Commit => {
                self.commit().await?;
            }

            ManagerAction::Finish => {
                self.finish().await?;
            }

            ManagerAction::GetState(tx) => {
                self.get_state(tx).await?;
            }

            ManagerAction::GetProgress(tx) => {
                let progress = self.progress.lock().unwrap();
                let _ = tx.send(progress.get_progress());
            }
        }
        Ok(())
    }

    fn change_phase(&mut self, phase: InstallationPhase) {
        let event = Event::InstallationPhaseChanged { phase };
        let _ = self.events.send(event);
        self.manager_state.phase = phase;
    }
}

impl InstallerService<ManagerState> for ManagerService {
    type Error = ManagerError;

    fn state(&self) -> ManagerState {
        self.manager_state.clone()
    }

    fn progress(&self) -> Arc<Mutex<ServiceStatusManager>> {
        Arc::clone(&self.progress)
    }

    fn events(&self) -> EventsSender {
        self.events.clone()
    }
}

/// Client to interact with the manager service.
///
/// The communication between the service and the client is based on message passing. This client
/// abstracts the details and offers a simple API.
#[derive(Clone)]
pub struct ManagerServiceClient {
    actions: ManagerActionSender,
}

impl ManagerServiceClient {
    /// Performs a probe.
    pub async fn probe(&self) -> Result<(), ManagerError> {
        self.actions.send(ManagerAction::Probe)?;
        Ok(())
    }

    /// Starts the installation.
    pub async fn commit(&self) -> Result<(), ManagerError> {
        self.actions.send(ManagerAction::Commit)?;
        Ok(())
    }

    /// Finishes the installation.
    pub async fn finish(&self) -> Result<(), ManagerError> {
        self.actions.send(ManagerAction::Finish)?;
        Ok(())
    }

    /// Get the installation status.
    pub async fn get_state(&self) -> Result<InstallerStatus, ManagerError> {
        let (tx, rx) = oneshot::channel();
        self.actions.send(ManagerAction::GetState(tx))?;
        Ok(rx.await?)
    }

    pub async fn get_progress(&self) -> Result<Option<ProgressSummary>, ManagerError> {
        let (tx, rx) = oneshot::channel();
        self.actions.send(ManagerAction::GetProgress(tx))?;
        Ok(rx.await?)
    }
}

/// Services used by the manager service.
#[derive(Clone)]
pub struct Services {
    software: SoftwareHTTPClient,
    storage: StorageHTTPClient,
}

impl Services {
    pub fn new(http_base: BaseHTTPClient) -> Self {
        Self {
            software: SoftwareHTTPClient::new(http_base.clone()),
            storage: StorageHTTPClient::new(http_base),
        }
    }
}
