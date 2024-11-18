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

/// Implements a products registry.
///
/// The products registry contains the specification of every know product.
use serde::Deserialize;
use serde_with::{formats::CommaSeparator, serde_as, StringWithSeparator};
use std::path::{Path, PathBuf};

#[derive(thiserror::Error, Debug)]
pub enum ProductsRegistryError {
    #[error("Could not read the products registry: {0}")]
    IO(#[from] std::io::Error),
    #[error("Could not deserialize a product specification: {0}")]
    Deserialize(#[from] serde_yaml::Error),
}

/// Products registry.
#[derive(Clone, Default, Debug, Deserialize)]
pub struct ProductsRegistry {
    pub products: Vec<ProductSpec>,
}

impl ProductsRegistry {
    pub fn load() -> Result<Self, ProductsRegistryError> {
        let products_dir = if let Ok(dir) = std::env::var("AGAMA_PRODUCTS_DIR") {
            PathBuf::from(dir)
        } else {
            PathBuf::from("/usr/share/agama/products.d")
        };

        if !products_dir.exists() {
            return Err(ProductsRegistryError::IO(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "products.d directory does not exist",
            )));
        }

        Self::load_from(products_dir)
    }

    pub fn load_from<P: AsRef<Path>>(products_path: P) -> Result<Self, ProductsRegistryError> {
        let entries = std::fs::read_dir(products_path)?;
        let mut products = vec![];

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            let Some(ext) = path.extension() else {
                continue;
            };

            if path.is_file() && (ext == "yaml" || ext == "yml") {
                let product = ProductSpec::load_from(path)?;
                products.push(product);
            }
        }

        Ok(Self { products })
    }

    pub fn is_multiproduct(&self) -> bool {
        self.products.len() > 1
    }
}

// TODO: ideally, this code should be auto-generated from a JSON schema definition.
/// Product specification (e.g., Tumbleweed).
#[derive(Clone, Debug, Deserialize)]
pub struct ProductSpec {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub software: SoftwareSpec,
}

impl ProductSpec {
    pub fn load_from<P: AsRef<Path>>(path: P) -> Result<Self, ProductsRegistryError> {
        let contents = std::fs::read_to_string(path)?;
        let product: ProductSpec = serde_yaml::from_str(&contents)?;
        Ok(product)
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct SoftwareSpec {
    pub installation_repositories: Vec<RepositorySpec>,
    pub mandatory_patterns: Vec<String>,
    pub optional_patterns: Option<Vec<String>>,
    pub mandatory_packages: Vec<String>,
    pub optional_packages: Option<Vec<String>>,
    pub base_product: String,
}

#[serde_as]
#[derive(Clone, Debug, Deserialize)]
pub struct RepositorySpec {
    pub url: String,
    #[serde(default)]
    #[serde_as(as = "StringWithSeparator::<CommaSeparator, String>")]
    pub archs: Vec<String>,
}

#[cfg(test)]
mod test {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_reading_config() {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/share/products.d");
        let config = ProductsRegistry::load_from(path.as_path()).unwrap();
        assert_eq!(config.products.len(), 1);
    }
}
