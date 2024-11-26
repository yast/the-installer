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

import React, { useState, useRef } from "react";
import { Form, FormGroup, FileUpload } from "@patternfly/react-core";
import { PasswordAndConfirmationInput } from "~/components/core";
import { useRootUserMutation } from "~/queries/users";
import { _ } from "~/i18n";

/**
 * A form to set or change the root password
 * @component
 *
 */
export default function RawRootPasswordForm() {
  const setRootUser = useRootUserMutation();
  const [password, setPassword] = useState("");
  const [sshKey, setSSHKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isValidPassword, setIsValidPassword] = useState(true);
  const passwordRef = useRef();

  const accept = async (e) => {
    e.preventDefault();
    // TODO: handle errors
    // the web UI only supports plain text passwords, this resets the flag if an encrypted password
    // was previously set from CLI
    if (password !== "") await setRootUser.mutateAsync({ password, passwordEncrypted: false });
    close();
  };

  const onPasswordChange = (_, value) => setPassword(value);

  const onPasswordValidation = (isValid) => setIsValidPassword(isValid);

  const startUploading = () => setIsUploading(true);
  const stopUploading = () => setIsUploading(false);
  const clearKey = () => setSSHKey("");

  console.log("FIXME: drop this console.log. isValidPassword:", isValidPassword);

  return (
    <Form id="root-password" onSubmit={accept}>
      <PasswordAndConfirmationInput
        inputRef={passwordRef}
        value={password}
        onChange={onPasswordChange}
        onValidation={onPasswordValidation}
      />
      <FormGroup fieldId="sshKey" label={_("Root SSH public key")}>
        <FileUpload
          id="sshKey"
          type="text"
          value={sshKey}
          filenamePlaceholder={_("Upload, paste, or drop an SSH public key")}
          // TRANSLATORS: push button label
          browseButtonText={_("Upload")}
          // TRANSLATORS: push button label, clears the related input field
          clearButtonText={_("Clear")}
          isLoading={isUploading}
          onDataChange={(_, value) => setSSHKey(value)}
          onTextChange={(_, value) => setSSHKey(value)}
          onReadStarted={startUploading}
          onReadFinished={stopUploading}
          onClearClick={clearKey}
        />
      </FormGroup>
    </Form>
  );
}
