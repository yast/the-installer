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

use agama_lib::{manager::InstallerStatus, progress::ProgressSummary};
use tokio::sync::oneshot;

use super::{ManagerAction, ManagerActionSender, ManagerError};
use crate::services::ServiceStatusClient;

/// Client to interact with the manager service.
///
/// The communication between the service and the client is based on message passing. This client
/// abstracts the details and offers a simple API.
#[derive(Clone)]
pub struct ManagerServiceClient {
    actions: ManagerActionSender,
    status: ServiceStatusClient,
}

impl ManagerServiceClient {
    pub fn new(actions: ManagerActionSender, status: ServiceStatusClient) -> Self {
        Self { actions, status }
    }

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

    /// Returns the installer's state.
    pub async fn get_state(&self) -> Result<InstallerStatus, ManagerError> {
        let (tx, rx) = oneshot::channel();
        self.actions.send(ManagerAction::GetState(tx))?;
        Ok(rx.await?)
    }

    /// Gets the current operation progress.
    pub async fn get_progress(&self) -> Result<Option<ProgressSummary>, ManagerError> {
        Ok(self.status.get_progress().await?)
    }
}
