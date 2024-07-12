use anyhow::Context;
use reqwest::{header, Client, Response};
use serde::de::DeserializeOwned;

use crate::{auth::AuthToken, error::ServiceError};

/// Base that all http clients should use.
/// 
/// It provides several features including automatic base url switching,
/// websocket events listening or object constructions.
/// 
/// Usage should be just thin layer in domain specific client.
/// 
/// ```no_run
///   use agama_lib::questions::model::Question;
///   use agama_lib::base_http_client::BaseHTTPClient;
///   use agama_lib::error::ServiceError;
/// 
///   async fn get_questions() -> Result<Vec<Question>, ServiceError> {
///     let client = BaseHTTPClient::new()?;
///     client.get("/questions").await
///   }
/// ```
pub struct BaseHTTPClient {
    client: Client,
    pub base_url: String,
}

const API_URL: &str = "http://localhost/api";

impl BaseHTTPClient {
    // if there is need for client without authorization, create new constructor for it
    pub fn new() -> Result<Self, ServiceError> {
        let token = AuthToken::find().context("You are not logged in")?;

        let mut headers = header::HeaderMap::new();
        // just use generic anyhow error here as Bearer format is constructed by us, so failures can come only from token
        let value = header::HeaderValue::from_str(format!("Bearer {}", token).as_str())
            .map_err(|e| anyhow::Error::new(e))?;

        headers.insert(header::AUTHORIZATION, value);

        let client = Client::builder().default_headers(headers).build()?;

        Ok(Self {
            client,
            base_url: API_URL.to_string(), // TODO: add support for remote server
        })
    }

    const NO_TEXT: &'static str = "No text";
    /// Simple wrapper around Response to get object from response.
    /// If complete Response is needed use get_response method.
    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T, ServiceError> {
        let response = self.get_response(path).await?;
        if response.status().is_success() {
            response.json::<T>().await.map_err(|e| e.into())
        } else {
            let code = response.status().as_u16();
            let text = response
                .text()
                .await
                .unwrap_or_else(|_| Self::NO_TEXT.to_string());
            Err(ServiceError::BackendError(code, text))
        }        
    }

    /// Calls GET method on given path and return Response that can be further
    /// processed. If only simple object from json is required, use method get.
    pub async fn get_response(&self, path: &str) -> Result<Response, ServiceError> {
        self.client
            .get(self.url(path))
            .send()
            .await
            .map_err(|e| e.into())
    }

    fn url(&self, path: &str) -> String {
        self.base_url.clone() + path
    }
}
