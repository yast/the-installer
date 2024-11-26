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

import { Grid, GridItem } from "@patternfly/react-core";
import React from "react";
import { Page } from "~/components/core";
import FirstUserForm from "./RawFirstUserForm";
import RawRootPasswordForm from "./RawRootPasswordForm";

function ProductSelectionPage() {
  return (
    <Page>
      <Page.Content>
        <Grid hasGutter>
          <GridItem sm={12} md={6}>
            <Page.Section title="User">
              <FirstUserForm />
            </Page.Section>
          </GridItem>
          <GridItem sm={12} md={6}>
            <Page.Section title="Root auth method">
              <RawRootPasswordForm />
            </Page.Section>
          </GridItem>
        </Grid>
      </Page.Content>
      <Page.Actions>
        <Page.Cancel />
      </Page.Actions>
    </Page>
  );
}

export default ProductSelectionPage;
