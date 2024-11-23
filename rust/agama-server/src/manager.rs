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

use agama_lib::{base_http_client::BaseHTTPClient, error::ServiceError};

pub mod backend;
pub mod web;

use axum::Router;
pub use backend::ManagerError;
use web::manager_router;

use crate::{products::ProductsRegistry, web::EventsSender};

// TODO: the `service` function should receive the information that might be needed to set up the
// service. What about creating an `Application` struct that holdes the HTTP client, the D-Bus
// connection, and configuration, etc.?
pub async fn service(http: BaseHTTPClient, events: EventsSender) -> Result<Router, ServiceError> {
    // TODO: the products registry should be injected and it might live behind a shared reference
    // if other services need to access it.
    let products = ProductsRegistry::load().unwrap();
    let client = backend::ManagerService::start(products, http, events).await;
    Ok(manager_router(client))
}
