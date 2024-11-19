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
use crate::web::{Event, EventsSender};
use agama_lib::{
    base_http_client::BaseHTTPClient,
    error::ServiceError,
    manager::{InstallationPhase, InstallerStatus},
    software::SoftwareHTTPClient,
    storage::http_client::StorageHTTPClient,
};
use tokio::sync::{mpsc, oneshot};

pub type ManagerActionSender = mpsc::UnboundedSender<ManagerAction>;
pub type ManagerActionReceiver = mpsc::UnboundedReceiver<ManagerAction>;

#[derive(thiserror::Error, Debug)]
pub enum ManagerError {
    #[error("Service error: {0}")]
    Service(#[from] ServiceError),
    #[error("Could not send the action to the service: {0}")]
    Send(#[from] mpsc::error::SendError<ManagerAction>),
    #[error("Could not receive the result: {0}")]
    RecvResult(#[from] oneshot::error::RecvError),
    #[error("Could not send the result")]
    SendResult,
}

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
}

// TODO: somehow duplicated from agama-server/web/common.rs
#[derive(Clone, Copy, PartialEq)]
pub enum ServiceStatus {
    Idle = 0,
    Busy = 1,
}

/// Main service for the installation process.
///
/// It is responsible for orchestrating the installation process. It may execute YaST2 clients or
/// call to other services through D-Bus or HTTP.
pub struct ManagerService {
    pub phase: InstallationPhase,
    pub status: ServiceStatus,
    recv: mpsc::UnboundedReceiver<ManagerAction>,
    sender: mpsc::UnboundedSender<ManagerAction>,
    events: EventsSender,
    services: Services,
    products: ProductsRegistry,
}

impl ManagerService {
    pub fn new(products: ProductsRegistry, http: BaseHTTPClient, events: EventsSender) -> Self {
        let (tx, rx) = mpsc::unbounded_channel();

        Self {
            recv: rx,
            sender: tx,
            products,
            events,
            services: Services::new(http),
            phase: InstallationPhase::Startup,
            status: ServiceStatus::Idle,
        }
    }

    pub fn input(&self) -> mpsc::UnboundedSender<ManagerAction> {
        self.sender.clone()
    }

    pub async fn startup(&mut self) -> Result<(), ManagerError> {
        tracing::info!("Starting the manager service");
        self.change_status(ServiceStatus::Busy);
        self.phase = InstallationPhase::Startup;
        if !self.products.is_multiproduct() {
            // TODO: autoselect the product
            self.probe().await?;
        }
        self.change_status(ServiceStatus::Idle);
        Ok(())
    }

    pub async fn probe(&mut self) -> Result<(), ManagerError> {
        tracing::info!("Probing the system");
        self.change_status(ServiceStatus::Busy);
        self.change_phase(InstallationPhase::Config);
        self.services.software.probe().await?;
        self.services.storage.probe().await?;
        self.change_status(ServiceStatus::Idle);
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
        let status = InstallerStatus {
            is_busy: self.status == ServiceStatus::Busy,
            use_iguana: false,
            can_install: false,
            phase: self.phase,
        };
        tx.send(status).map_err(|_| ManagerError::SendResult)
    }

    fn change_status(&mut self, status: ServiceStatus) {
        let event = Event::ServiceStatusChanged {
            service: "manager".to_string(),
            status: (status as u32),
        };
        if let Err(error) = self.events.send(event) {
            tracing::error!("Could not send the event: {error}");
        }
        self.status = status;
    }

    fn change_phase(&mut self, phase: InstallationPhase) {
        let event = Event::InstallationPhaseChanged { phase };
        if let Err(error) = self.events.send(event) {
            tracing::error!("Could not send the event: {error}");
        }
        self.phase = phase;
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
        }
        Ok(())
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
}

/// Services used by the manager service.
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
