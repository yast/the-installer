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

use crate::products::ProductsRegistry;
use crate::services::{ServiceStatusClient, ServiceStatusManager};
use crate::web::{Event, EventsSender};
use agama_lib::{
    base_http_client::BaseHTTPClient,
    manager::{InstallationPhase, InstallerStatus},
    software::SoftwareHTTPClient,
    storage::http_client::StorageHTTPClient,
};
use tokio::sync::{mpsc, oneshot};

use super::{ManagerError, ManagerServiceClient};

const SERVICE_NAME: &str = "org.opensuse.Agama.Manager1";

/// Actions that the manager service can perform.
#[derive(Debug)]
pub enum ManagerAction {
    /// Performs a probe (probes the hardware, refresh the repositories, etc.).
    Probe,
    /// Starts the installation.
    Commit,
    /// Finishes the installation.
    Finish,
    /// Returns the installation status.
    GetState(oneshot::Sender<InstallerStatus>),
}

/// Main service for the installation process.
pub struct ManagerServiceServer {
    pub recv: mpsc::UnboundedReceiver<ManagerAction>,
    pub sender: mpsc::UnboundedSender<ManagerAction>,
    pub events: EventsSender,
    pub products: ProductsRegistry,
    pub phase: InstallationPhase,
    pub http_clients: HTTPClients,
}

impl ManagerServiceServer {
    pub async fn startup(&mut self, status: ServiceStatusClient) -> Result<(), ManagerError> {
        tracing::info!("Starting the manager service");

        if !self.products.is_multiproduct() {
            // TODO: autoselect the product
            self.probe(status).await?;
        }

        Ok(())
    }

    pub async fn probe(&mut self, status: ServiceStatusClient) -> Result<(), ManagerError> {
        tracing::info!("Probing the system");

        let steps = vec![
            "Analyze disks".to_string(),
            "Configure software".to_string(),
        ];

        status.start_task(steps).await?;
        self.change_phase(InstallationPhase::Config);

        let services = self.http_clients.clone();
        tokio::spawn(async move {
            services.software.probe().await.unwrap();
            let _ = status.next_step();
            services.storage.probe().await.unwrap();
            let _ = status.finish_task();
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
        status: ServiceStatusClient,
    ) -> Result<(), ManagerError> {
        let status = status.get_progress().await.unwrap();
        let installer_status = InstallerStatus {
            is_busy: status.is_some(),
            // TODO: implement use_iguana and can_install
            can_install: false,
            use_iguana: false,
            phase: self.phase,
        };
        tx.send(installer_status)
            .map_err(|_| ManagerError::SendResult)
    }

    /// Starts the manager loop and returns a client.
    ///
    /// The manager receives actions requests from the client using a channel.
    pub async fn start(self) -> ManagerServiceClient {
        let status = ServiceStatusManager::new(SERVICE_NAME, self.events.clone());
        let status = status.start();

        let client = ManagerServiceClient::new(self.sender.clone(), status.clone());

        tokio::spawn(async move {
            self.run(status).await;
        });

        client
    }

    async fn run(mut self, status: ServiceStatusClient) {
        loop {
            let action = self.recv.recv().await;
            tracing::info!("manager dispatching action: {:?}", &action);
            let Some(action) = action else {
                tracing::error!("Manager action channel closed");
                break;
            };

            if let Err(error) = self.dispatch(action, status.clone()).await {
                tracing::error!("Manager dispatch error: {error}");
                // Send the message back.
            }
        }
    }

    async fn dispatch(
        &mut self,
        action: ManagerAction,
        status: ServiceStatusClient,
    ) -> Result<(), ManagerError> {
        match action {
            ManagerAction::Probe => {
                self.probe(status).await?;
            }

            ManagerAction::Commit => {
                self.commit().await?;
            }

            ManagerAction::Finish => {
                self.finish().await?;
            }

            ManagerAction::GetState(tx) => {
                self.get_state(tx, status).await?;
            }
        }
        Ok(())
    }

    fn change_phase(&mut self, phase: InstallationPhase) {
        let event = Event::InstallationPhaseChanged { phase };
        let _ = self.events.send(event);
        self.phase = phase;
    }
}

/// Services used by the manager service.
///
/// TODO: move to a more generic struct that can be used by other services.
#[derive(Clone)]
pub struct HTTPClients {
    software: SoftwareHTTPClient,
    storage: StorageHTTPClient,
}

impl HTTPClients {
    pub fn new(http_base: BaseHTTPClient) -> Self {
        Self {
            software: SoftwareHTTPClient::new(http_base.clone()),
            storage: StorageHTTPClient::new(http_base),
        }
    }
}
