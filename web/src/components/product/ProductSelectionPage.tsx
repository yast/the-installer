/*
 * Copyright (c) [2022-2024] SUSE LLC
 *
 * All Rights Reserved.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, contact SUSE LLC.
 *
 * To contact SUSE LLC about this file by physical or electronic mail, you may
 * find current contact information at www.suse.com.
 */

import React, { useState } from "react";
import {
  Card,
  CardBody,
  Form,
  Grid,
  GridItem,
  List,
  ListItem,
  Split,
  Stack,
  FormGroup,
  Button,
  Checkbox,
} from "@patternfly/react-core";
import { Navigate, useNavigate } from "react-router-dom";
import { Page } from "~/components/core";
import { Center } from "~/components/layout";
import { useConfigMutation, useProduct, useRegistration } from "~/queries/software";
import pfTextStyles from "@patternfly/react-styles/css/utilities/Text/text";
import pfRadioStyles from "@patternfly/react-styles/css/components/Radio/radio";
import { sprintf } from "sprintf-js";
import { _ } from "~/i18n";
import { PATHS } from "~/router";
import { isEmpty } from "~/utils";
import { Product } from "~/types/software";
import EulaDialog from "./EulaDialog";

const ResponsiveGridItem = ({ children }) => (
  <GridItem sm={10} smOffset={1} lg={8} lgOffset={2} xl={6} xlOffset={3}>
    {children}
  </GridItem>
);

const Option = ({ product, isChecked, onChange }) => {
  const detailsId = `${product.id}-details`;
  const logoSrc = `assets/logos/${product.icon}`;
  // TRANSLATORS: %s will be replaced by a product name. E.g., "openSUSE Tumbleweed"
  const logoAltText = sprintf(_("%s logo"), product.name);

  return (
    <ListItem aria-label={product.name}>
      <Card isRounded>
        <CardBody>
          <Split hasGutter>
            <input
              id={product.id}
              type="radio"
              name="product"
              className={pfRadioStyles.radioInput}
              checked={isChecked}
              onChange={onChange}
              aria-details={detailsId}
            />
            <img aria-hidden src={logoSrc} alt={logoAltText} />
            <Stack hasGutter>
              <label
                htmlFor={product.id}
                className={`${pfTextStyles.fontSizeLg} ${pfTextStyles.fontWeightBold}`}
              >
                {product.name}
              </label>
              <p id={detailsId}>{product.description}</p>
            </Stack>
          </Split>
        </CardBody>
      </Card>
    </ListItem>
  );
};

const BackLink = () => {
  const navigate = useNavigate();
  return (
    <Button size="lg" variant="link" onClick={() => navigate("/")}>
      {_("Cancel")}
    </Button>
  );
};

function ProductSelectionPage() {
  const setConfig = useConfigMutation();
  const registration = useRegistration();
  const { products, selectedProduct } = useProduct({ suspense: true });
  const [nextProduct, setNextProduct] = useState(selectedProduct);
  // FIXME: should not be accepted by default first selectedProduct is accepted
  // because it's a singleProduct iso.
  const [eulaAccepted, setEulaAccepted] = useState(!!selectedProduct); // useState(selectedProduct.eula)
  const [showEula, setShowEula] = useState(false); // useState(selectedProduct.eula)
  const [isLoading, setIsLoading] = useState(false);

  if (!isEmpty(registration?.key)) return <Navigate to={PATHS.root} />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nextProduct) {
      setConfig.mutate({ product: nextProduct.id });
      setIsLoading(true);
    }
  };

  const selectProduct = (product: Product) => {
    setNextProduct(product);
    setEulaAccepted(!!selectedProduct && selectedProduct === product);
  };

  const hasSelectionChanged = nextProduct && nextProduct !== selectedProduct;
  const hasEula = true; // nextProduct?.eula;
  const isEulaCheckboxDisabled = hasEula && !hasSelectionChanged;
  const isSelectionDisabled = !hasSelectionChanged || (hasEula && !eulaAccepted);

  const [eulaTextStart, eulaTextLink, eulaTextEnd] = sprintf(
    _("Understand and accept [%s EULA]"),
    selectedProduct.name,
  ).split(/[[\]]/);

  return (
    <Page>
      <Page.Content>
        {showEula && <EulaDialog onClose={() => setShowEula(false)} />}
        <Center>
          <Form id="productSelectionForm" onSubmit={onSubmit}>
            <Grid hasGutter>
              <ResponsiveGridItem>
                <FormGroup role="radiogroup" label={_("Select a product")}>
                  <List isPlain aria-label={_("Available products")}>
                    {products.map((product, index) => (
                      <Option
                        key={index}
                        product={product}
                        isChecked={nextProduct === product}
                        onChange={() => selectProduct(product)}
                      />
                    ))}
                  </List>
                </FormGroup>
              </ResponsiveGridItem>
            </Grid>
          </Form>
        </Center>
      </Page.Content>
      <Page.Actions>
        {selectedProduct && !isLoading && <BackLink />}
        <Checkbox
          isChecked={eulaAccepted}
          onChange={(_, accepted) => setEulaAccepted(accepted)}
          isDisabled={isEulaCheckboxDisabled}
          id="eula-acceptance"
          form="productSelectionForm"
          label={
            <>
              {eulaTextStart}{" "}
              <Button variant="link" isInline onClick={() => setShowEula(true)}>
                {eulaTextLink}
              </Button>{" "}
              {eulaTextEnd}
            </>
          }
        />
        <Page.Submit
          form="productSelectionForm"
          isDisabled={isSelectionDisabled}
          isLoading={isLoading}
        >
          {_("Select")}
        </Page.Submit>
      </Page.Actions>
    </Page>
  );
}

export default ProductSelectionPage;
