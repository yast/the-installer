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

use std::sync::{Arc, Mutex};

use crate::web::{Event, EventsSender};
use agama_lib::progress::{Progress, ProgressSequence, ProgressSummary};
use futures_util::Future;

mod service_status;
pub use service_status::ServiceStatusManager;

// TODO: somehow duplicated from agama-server/web/common.rs
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ServiceStatus {
    Idle = 0,
    Busy = 1,
}

/// This trait serves as a base to implement an installer service (e.g. the manager service). It
/// defines a way to run background tasks and keep track of the service status and progress using a
/// `ServiceStatusManager` struct.
pub trait InstallerService<S>
where
    S: Clone + Send + 'static,
{
    type Error: std::error::Error;

    /// Returns the `ServiceStatusManager` for this service.
    fn progress(&self) -> Arc<Mutex<ServiceStatusManager>>;

    /// Returns the `EventsSender` for this service.
    fn events(&self) -> EventsSender;

    /// Returns the state of this service.
    fn state(&self) -> S;

    /// Determines whether the service is busy or not.
    fn is_busy(&self) -> bool {
        let progress = self.progress();
        let progress = progress.lock().unwrap();
        progress.is_busy()
    }

    /// Runs a background task unless the service is busy.
    ///
    /// FIXME: return an error if the service is already busy.
    fn run_in_background<F, Fut>(&mut self, func: F)
    where
        F: FnOnce(EventsSender, Arc<Mutex<ServiceStatusManager>>, S) -> Fut + Send + 'static,
        Fut: Future<Output = Result<(), Self::Error>> + std::marker::Send,
    {
        if self.is_busy() {
            tracing::warn!("A service task is already running.");
            return;
        }

        let events = self.events().clone();
        let state = self.state().clone();
        let progress = Arc::clone(&self.progress());
        tokio::spawn(async move {
            if let Err(_error) = func(events.clone(), progress, state).await {
                tracing::error!("Failed to run the background task");
            }
        });
    }
}
