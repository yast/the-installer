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

// NOTE: we could distinguish between manager and client errors, having a different
// `ManagerClientError` type.

use agama_lib::base_http_client::BaseHTTPClientError;
use tokio::sync::{mpsc, oneshot};

use super::backend::ManagerAction;

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
}
