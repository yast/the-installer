use agama_lib::auth::AuthToken;
use futures_util::TryStreamExt;
use reqwest_websocket::{Message, RequestBuilderExt, WebSocket};

pub async fn run() -> anyhow::Result<()> {
    let Some(token) = AuthToken::find() else {
        println!("You need to login for generating a valid token");
        return Ok(());
    };

    let client = agama_lib::http_client(token.as_str()).unwrap();
    let response = client
        .get("ws://localhost/api/ws")
        .upgrade()
        .send()
        .await
        .unwrap();
    let mut websocket = response.into_websocket().await.unwrap();
    while let Some(message) = websocket.try_next().await.unwrap() {
        match message {
            Message::Text(text) => println!("{text}"),
            _ => {}
        }
    }
    Ok(())
}

struct EventsMonitor {
    ws: WebSocket,
}

impl EventsMonitor {}
