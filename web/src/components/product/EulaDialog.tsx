/*
 * Copyright (c) [2025] SUSE LLC
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
import { Popup } from "~/components/core";
import { useProduct } from "~/queries/software";
import { _ } from "~/i18n";
import {
  Divider,
  MenuToggle,
  Select,
  SelectOption,
  Split,
  SplitItem,
  Stack,
} from "@patternfly/react-core";

function EulaDialog({ onClose }) {
  const [locale, setLocale] = useState("en");
  const [localeSelectorOpen, setLocaleSelectorOpen] = useState(false);
  const { selectedProduct: product } = useProduct({ suspense: true });
  const locales = ["en", "es", "de", "cz", "pt"];
  const localesToggler = (toggleRef) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setLocaleSelectorOpen(!localeSelectorOpen)}
      isExpanded={localeSelectorOpen}
    >
      {locale}
    </MenuToggle>
  );

  const onLocaleSelection = (_, locale: string) => {
    setLocale(locale);
    setLocaleSelectorOpen(false);
  };

  console.log("product", product);

  const eula = "Lorem ipsum";

  return (
    <Popup isOpen>
      <Stack hasGutter>
        <Split>
          <SplitItem isFilled>
            <h1>{_("Eula")}</h1>
          </SplitItem>
          <Select
            isOpen={localeSelectorOpen}
            selected={locale}
            onSelect={onLocaleSelection}
            onOpenChange={(isOpen) => setLocaleSelectorOpen(!isOpen)}
            toggle={localesToggler}
          >
            {locales.map((locale) => (
              <SelectOption key={locale} value={locale}>
                {locale}
              </SelectOption>
            ))}
          </Select>
        </Split>
        <Divider />
        {eula}
      </Stack>
      <Popup.Actions>
        <Popup.Confirm onClick={onClose}>{_("Close")}</Popup.Confirm>
      </Popup.Actions>
    </Popup>
  );
}

export default EulaDialog;
