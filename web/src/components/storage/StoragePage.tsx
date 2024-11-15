/*
 * Copyright (c) [2024] SUSE LLC
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

import React, { useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataListAction,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  Flex,
  Grid,
  GridItem,
  Label,
  List,
  ListItem,
  Menu,
  MenuContainer,
  MenuContent,
  MenuFooter,
  MenuGroup,
  MenuItem,
  MenuItemAction,
  MenuList,
  MenuToggle,
  Split,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { Link, Page } from "~/components/core/";
import {
  useAvailableDevices,
  useConfigDevices,
  useDeprecated,
  useDevices,
} from "~/queries/storage";
import { useQueryClient } from "@tanstack/react-query";
import { refresh } from "~/api/storage";
import { _ } from "~/i18n";
import { Icon } from "../layout";
import InstalaltionDeviceActionsMenu from "./InstallationDeviceActionsMenu";
import * as driveUI from "~/components/storage/utils/drive";
import { deviceLabel, SPACE_POLICIES } from "./utils";
import { typeDescription, contentDescription } from "./utils/device";
import * as driveUtils from "./utils/drive";
import { useNavigate } from "react-router-dom";
import { DeviceDetails } from "./device-utils";
import DeviceSelection from "./DeviceSelection";

const FakeMenu = ({ label, options }) => {
  const navigate = useNavigate();
  const menuRef = useRef();
  const toggleMenuRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen(!isOpen);

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggleRef={toggleMenuRef}
      toggle={
        <MenuToggle
          variant="plain"
          ref={toggleMenuRef}
          onClick={onToggle}
          isExpanded={isOpen}
          className="menu-toggle-inline"
        >
          <b>{label}</b>
        </MenuToggle>
      }
      menuRef={menuRef}
      menu={
        <Menu ref={menuRef}>
          <MenuContent>
            <MenuList>
              {options.map((option) => (
                <MenuItem
                  key="add-partition"
                  itemId="add-partition"
                  description="Add another partition or whatever"
                  onClick={() => navigate("/storage/space-policy")}
                >
                  <Flex component="span" justifyContent={{ default: "justifyContentSpaceBetween" }}>
                    <span>{option}</span>
                  </Flex>
                </MenuItem>
              ))}
            </MenuList>
          </MenuContent>
        </Menu>
      }
    />
  );
};
const NewContentSelector = ({ device }) => {
  const navigate = useNavigate();
  const menuRef = useRef();
  const toggleMenuRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen(!isOpen);

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggleRef={toggleMenuRef}
      toggle={
        <MenuToggle
          variant="plain"
          ref={toggleMenuRef}
          onClick={onToggle}
          isExpanded={isOpen}
          className="menu-toggle-inline"
        >
          <b>{driveUtils.contentDescription(device)}</b>
        </MenuToggle>
      }
      menuRef={menuRef}
      menu={
        <Menu ref={menuRef}>
          <MenuContent>
            <MenuList>
              {device.partitions
                .filter((p) => !p.name)
                .map((partition) => {
                  console.log("partition is", partition);
                  return (
                    <MenuItem
                      key={partition.mountPath}
                      itemId={partition.mountPath}
                      description="Btrfs with snapshots"
                      actions={
                        <>
                          <MenuItemAction
                            style={{ paddingInline: "4px", alignSelf: "center" }}
                            icon={<Icon name="edit_square" size="xs" aria-label={"Edit"} />}
                            actionId={`edit-${partition.mountPath}`}
                            aria-label={`Edit ${partition.mountPath}`}
                          />
                          <MenuItemAction
                            style={{ paddingInline: "4px", alignSelf: "center" }}
                            icon={<Icon name="delete" size="xs" aria-label={"Edit"} />}
                            actionId={`delete-${partition.mountPath}`}
                            aria-label={`Delete ${partition.mountPath}`}
                          />
                        </>
                      }
                    >
                      {partition.mountPath}
                    </MenuItem>
                  );
                })}
              <Divider component="li" />
              <MenuItem
                key="add-partition"
                itemId="add-partition"
                description="Add another partition or whatever"
                onClick={() => navigate("/storage/space-policy")}
              >
                <Flex component="span" justifyContent={{ default: "justifyContentSpaceBetween" }}>
                  <span>Add partition</span>
                </Flex>
              </MenuItem>
            </MenuList>
          </MenuContent>
        </Menu>
      }
    />
  );
};

const CurrentContentActionsSelector = ({ device, currentAction }) => {
  const navigate = useNavigate();
  const menuRef = useRef();
  const toggleMenuRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen(!isOpen);
  // FIXME: make below in a more elegant, trustable way
  const [customPolicy, ...predefinedPolicies] = SPACE_POLICIES.toReversed();

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggleRef={toggleMenuRef}
      toggle={
        <MenuToggle
          variant="plain"
          ref={toggleMenuRef}
          onClick={onToggle}
          isExpanded={isOpen}
          className="menu-toggle-inline"
        >
          <b>{driveUtils.oldContentActionsDescription(device)}</b>
        </MenuToggle>
      }
      menuRef={menuRef}
      menu={
        <Menu ref={menuRef} activeItemId={currentAction.sid}>
          <div style={{ padding: "1em" }}>
            Choose what to do with found <b>{contentDescription(device)}</b>
          </div>
          <Divider component="hr" />
          <MenuContent>
            <MenuList>
              {predefinedPolicies.map((policy) => {
                const isSelected = policy === currentAction;

                return (
                  <MenuItem
                    key={policy.id}
                    itemId={policy.id}
                    isSelected={isSelected}
                    description={policy.description}
                  >
                    {policy.label}
                  </MenuItem>
                );
              })}
              <Divider component="li" />
              <MenuItem
                key={customPolicy.id}
                itemId={customPolicy.id}
                description={customPolicy.description}
                onClick={() => navigate("/storage/space-policy")}
              >
                <Flex component="span" justifyContent={{ default: "justifyContentSpaceBetween" }}>
                  <span>{customPolicy.label}</span>
                </Flex>
              </MenuItem>
            </MenuList>
          </MenuContent>
        </Menu>
      }
    />
  );
};

const DriveSelector = ({ selected }) => {
  const navigate = useNavigate();
  const menuRef = useRef();
  const toggleMenuRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const devices = useAvailableDevices();
  const onToggle = () => setIsOpen(!isOpen);

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggleRef={toggleMenuRef}
      toggle={
        <MenuToggle
          variant="plain"
          ref={toggleMenuRef}
          onClick={onToggle}
          isExpanded={isOpen}
          className="menu-toggle-inline"
        >
          <b>{selected.name}</b>
        </MenuToggle>
      }
      menuRef={menuRef}
      menu={
        <Menu ref={menuRef} activeItemId={selected.sid}>
          <MenuContent>
            <MenuList>
              {devices.map((device) => {
                const isSelected = device === selected;
                // FIXME: use PF/Content with #component prop instead when migrating to PF6
                const Name = () =>
                  isSelected ? <b>{deviceLabel(device)}</b> : deviceLabel(device);

                return (
                  <MenuItem
                    key={device.sid}
                    itemId={device.sid}
                    isSelected={isSelected}
                    description={<>{typeDescription(device)}</>}
                  >
                    <Name />
                  </MenuItem>
                );
              })}
              <Divider component="li" />
              <MenuItem
                component="a"
                onClick={() => navigate("/storage/target-device")}
                itemId="lvm"
                description="Lorem ipsum dolor whatever"
              >
                <Flex component="span" justifyContent={{ default: "justifyContentSpaceBetween" }}>
                  <span>LVM</span>
                </Flex>
              </MenuItem>
              <MenuItem
                component="a"
                onClick={() => navigate("/storage/target-device")}
                itemId="raid"
                description="Lorem ipsum dolor whatever"
              >
                <Flex component="span" justifyContent={{ default: "justifyContentSpaceBetween" }}>
                  <span>RAID</span>
                </Flex>
              </MenuItem>
            </MenuList>
          </MenuContent>
        </Menu>
      }
    />
  );
};

const InstallationDevice = ({ drive, device }) => {
  const menuRef = React.useRef();
  const toggleRef = React.useRef();
  const newContentMenuRef = React.useRef();
  const toggleNewContentMenuRef = React.useRef();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [newContentMenuOpen, setNewContentMenuOpen] = React.useState<boolean>(false);
  const onToggleClick = () => setIsOpen(!isOpen);
  const onNewContentMenuToggleClick = () => setNewContentMenuOpen(!isOpen);

  return (
    <Card isCompact>
      <CardHeader>
        <CardTitle>
          <h4>
            Use <DriveSelector selected={device} /> for VG system
          </h4>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <ul>
          <Flex component="li" gap={{ default: "gapSm" }}>
            {/* Using <DriveSelector selected={drive} /> for all pvs after{" "} */}
            <CurrentContentActionsSelector device={drive} currentAction={SPACE_POLICIES[0]} />
          </Flex>
          <FakeMenu label="No partitions yet" options={["Add partition", "Reuse partition"]} />
        </ul>
        {/* <DescriptionList isCompact isFluid> */}
        {/*   <DescriptionListGroup> */}
        {/*     <DescriptionListTerm>{_("Current content")}</DescriptionListTerm> */}
        {/*     <DescriptionListDescription> */}
        {/*       <MenuContainer */}
        {/*         isOpen={isOpen} */}
        {/*         onOpenChange={setIsOpen} */}
        {/*         toggleRef={toggleRef} */}
        {/*         toggle={ */}
        {/*           <MenuToggle */}
        {/*             variant="plain" */}
        {/*             ref={toggleRef} */}
        {/*             onClick={onToggleClick} */}
        {/*             isExpanded={isOpen} */}
        {/*           > */}
        {/*             Use available space */}
        {/*           </MenuToggle> */}
        {/*         } */}
        {/*         menuRef={menuRef} */}
        {/*         menu={ */}
        {/*           <Menu ref={menuRef}> */}
        {/*             <MenuItem */}
        {/*               itemId="currentContent-delete" */}
        {/*               isSelected={device.spacePolicy === "delete"} */}
        {/*               description="All partitions will be removed and any data in the disks will be lost." */}
        {/*             > */}
        {/*               Delete */}
        {/*             </MenuItem> */}
        {/*             <MenuItem */}
        {/*               itemId="currentContent-shrink" */}
        {/*               description="The data is kept, but the current partitions will be resized as needed." */}
        {/*               isSelected={device.spacePolicy === "shrink"} */}
        {/*             > */}
        {/*               Shrink as needed */}
        {/*             </MenuItem> */}
        {/*             <MenuItem */}
        {/*               itemId="currentContent-keep" */}
        {/*               description="The data is kept. Only the space not assigned to any partition will be used" */}
        {/*               isSelected={device.spacePolicy === "keep"} */}
        {/*             > */}
        {/*               Use available space */}
        {/*             </MenuItem> */}
        {/*             <Divider component="li" /> */}
        {/*             <MenuItem */}
        {/*               itemId="currentContent-custom" */}
        {/*               description="Select what to do with each partition." */}
        {/*               isSelected={device.spacePolicy === "custom"} */}
        {/*             > */}
        {/*               Custom */}
        {/*             </MenuItem> */}
        {/*           </Menu> */}
        {/*         } */}
        {/*       /> */}
        {/*     </DescriptionListDescription> */}
        {/*   </DescriptionListGroup> */}
        {/*   <DescriptionListGroup> */}
        {/*     <DescriptionListTerm>{_("New content")}</DescriptionListTerm> */}
        {/*     <DescriptionListDescription> */}
        {/*       <MenuContainer */}
        {/*         isOpen={newContentMenuOpen} */}
        {/*         onOpenChange={setNewContentMenuOpen} */}
        {/*         toggleRef={toggleNewContentMenuRef} */}
        {/*         toggle={ */}
        {/*           <MenuToggle */}
        {/*             variant="plain" */}
        {/*             ref={toggleNewContentMenuRef} */}
        {/*             onClick={onNewContentMenuToggleClick} */}
        {/*             isExpanded={isOpen} */}
        {/*           > */}
        {/*             New partitions for root and swap will be created */}
        {/*           </MenuToggle> */}
        {/*         } */}
        {/*         menuRef={newContentMenuRef} */}
        {/*         menu={ */}
        {/*           <Menu ref={newContentMenuRef}> */}
        {/*             <MenuItem */}
        {/*               component="span" */}
        {/*               itemId="newContent-root" */}
        {/*               actions={ */}
        {/*                 <> */}
        {/*                   <MenuItemAction */}
        {/*                     icon={<Icon name="edit_square" size="xs" />} */}
        {/*                     aria-label="Edit root partition" */}
        {/*                   /> */}
        {/*                   <MenuItemAction */}
        {/*                     icon={<Icon name="apps" size="xs" />} */}
        {/*                     aria-label="Change root location" */}
        {/*                   /> */}
        {/*                   <MenuItemAction */}
        {/*                     icon={<Icon name="delete" size="xs" />} */}
        {/*                     aria-label="Delete root location" */}
        {/*                   /> */}
        {/*                 </> */}
        {/*               } */}
        {/*             > */}
        {/*               root */}
        {/*             </MenuItem> */}
        {/*             <MenuItem */}
        {/*               component="span" */}
        {/*               itemId="newContent-swap" */}
        {/*               actions={ */}
        {/*                 <> */}
        {/*                   <MenuItemAction */}
        {/*                     icon={<Icon name="edit_square" size="xs" />} */}
        {/*                     aria-label="Edit root partition" */}
        {/*                   /> */}
        {/*                   <MenuItemAction */}
        {/*                     icon={<Icon name="apps" size="xs" />} */}
        {/*                     aria-label="Change root location" */}
        {/*                   /> */}
        {/*                   <MenuItemAction */}
        {/*                     icon={<Icon name="delete" size="xs" />} */}
        {/*                     aria-label="Delete root location" */}
        {/*                   /> */}
        {/*                 </> */}
        {/*               } */}
        {/*             > */}
        {/*               swap */}
        {/*             </MenuItem> */}
        {/*             <Divider component="li" /> */}
        {/*             <MenuItem>Add another partition</MenuItem> */}
        {/*           </Menu> */}
        {/*         } */}
        {/*       /> */}
        {/*     </DescriptionListDescription> */}
        {/*   </DescriptionListGroup> */}
        {/* </DescriptionList> */}
      </CardBody>
    </Card>
  );
};

const Item = ({ mountPoint, type, content, onToggle, ...props }) => {
  const [moreActionsOpen, setMoreActionsOpen] = useState<boolean>(false);
  const toggleMoreActions = () => setMoreActionsOpen(!moreActionsOpen);

  return (
    <DataListItem {...props}>
      <DataListItemRow>
        <DataListToggle id={`toggler-for-${mountPoint}`} key="toggle" onClick={onToggle} />,
        <DataListItemCells
          dataListCells={[
            <DataListCell key="device-info">{type}</DataListCell>,
            <DataListCell key="device-partition">
              <div>{_("Add everything needed for booting keeping existing partitons")}</div>
            </DataListCell>,
          ]}
        />
        <DataListAction
          id="sda-actions"
          aria-label={_("More actions for sda")}
          isPlainButtonAction
          aria-labelledby="whatever"
        >
          <Split hasGutter>
            {/* <Button isInline variant="secondary"> */}
            {/*   {_("Move")} */}
            {/* </Button> */}
            <Dropdown
              popperProps={{ position: "right" }}
              onClick={toggleMoreActions}
              onSelect={toggleMoreActions}
              onOpenChange={toggleMoreActions}
              isOpen={moreActionsOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="plain"
                  isExpanded={false}
                  onClick={toggleMoreActions}
                >
                  <Icon name="more_vert" />
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem>{_("Move")}</DropdownItem>
              </DropdownList>
              <Divider />
              <DropdownGroup label={_("vg_system")}>
                <DropdownList>
                  <DropdownItem>{_("Edit vg_system")}</DropdownItem>
                  <DropdownItem>{_("Delete vg_system")}</DropdownItem>
                </DropdownList>
              </DropdownGroup>
              <Divider />
              <DropdownGroup label={_("sdb2")}>
                <DropdownList>
                  <DropdownItem>{_("Edit sdb2")}</DropdownItem>
                  <DropdownItem>{_("Discard sdb2")}</DropdownItem>
                </DropdownList>
              </DropdownGroup>
            </Dropdown>
          </Split>
        </DataListAction>
      </DataListItemRow>
      <DataListContent hasNoPadding aria-label="EntryDeatils" isHidden={!props.isExpanded}>
        {mountPoint}
        <Split hasGutter>
          <Stack hasGutter>
            <StackItem>
              <div>
                <b>{_("Space policy")}</b>
              </div>
              <div>{_("Kept existing partitions")}</div>
            </StackItem>

            <StackItem>
              <List isPlain>
                <ListItem>
                  <b>{_("System partitions")}</b>
                  <List isPlain>
                    <ListItem>{_("New physical volume(s) for vg_system")}</ListItem>
                    <ListItem>{_("Reusing /old_home from WD 1TiB")}</ListItem>
                  </List>
                </ListItem>
              </List>
            </StackItem>
          </Stack>
        </Split>
      </DataListContent>
    </DataListItem>
  );
};

export default function ProposalPage() {
  const drives = useConfigDevices();
  const devices = useDevices("system", { suspense: true });
  const deprecated = useDeprecated();
  const queryClient = useQueryClient();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  React.useEffect(() => {
    if (deprecated) {
      refresh().then(() => {
        queryClient.invalidateQueries({ queryKey: ["storage"] });
      });
    }
  }, [deprecated, queryClient]);

  const toggleExpandFor = (id: string) => {
    setExpandedItems(
      expandedItems.includes(id)
        ? expandedItems.filter((deviceId) => deviceId !== id)
        : [...expandedItems, id],
    );
  };

  return (
    <Page>
      <Page.Header>
        <h2>{_("Storage")}</h2>
      </Page.Header>

      <Page.Content>
        <Grid hasGutter>
          <GridItem sm={12}>
            <Page.Section
              title="Installation Devices"
              description={_(
                "Structure of the new system, including disk to suse adn additional devices like LVM volume groups.",
              )}
              actions={
                <>
                  <Button variant="link" isInline>
                    {_("More devices options")}
                  </Button>
                </>
              }
            >
              <Card isCompact>
                <CardHeader>
                  <CardTitle>
                    <h4>
                      Create Volume Group <FakeMenu label="system" options={["Edit", "Discard"]} />{" "}
                      over /dev/vda
                    </h4>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <NewContentSelector device={drives[0]} />
                </CardBody>
              </Card>
              <br />
              <List isPlain>
                {/* <ListItem> */}
                {/*   <Card isPlain> */}
                {/*     <CardHeader */}
                {/*       actions={{ */}
                {/*         actions: ( */}
                {/*           <> */}
                {/*             <Button variant="secondary">{_("Change device")}</Button> */}
                {/*           </> */}
                {/*         ), */}
                {/*       }} */}
                {/*     > */}
                {/*       <CardTitle> */}
                {/*         <h4>{_("/dev/vda")}</h4> */}
                {/*       </CardTitle> */}
                {/*     </CardHeader> */}
                {/*     <CardBody> */}
                {/*       <DescriptionList isHorizontal isCompact> */}
                {/*         <DescriptionListGroup> */}
                {/*           <DescriptionListTerm>{_("Current content")}</DescriptionListTerm> */}
                {/*           <DescriptionListDescription> */}
                {/*             {_("Existing partitions will be kept")}{" "} */}
                {/*             <Button variant="link" isInline> */}
                {/*               {_("Change")} */}
                {/*             </Button> */}
                {/*           </DescriptionListDescription> */}
                {/*         </DescriptionListGroup> */}
                {/*         <DescriptionListGroup> */}
                {/*           <DescriptionListTerm>{_("New content")}</DescriptionListTerm> */}
                {/*           <DescriptionListDescription> */}
                {/*             {_("Partitions root and swap will be created")}{" "} */}
                {/*             <Button variant="link" isInline> */}
                {/*               {_("Change")} */}
                {/*             </Button> */}
                {/*           </DescriptionListDescription> */}
                {/*         </DescriptionListGroup> */}
                {/*       </DescriptionList> */}
                {/*     </CardBody> */}
                {/*   </Card> */}
                {/* </ListItem> */}
                <ListItem>
                  {drives.map((drive, i) => {
                    const device = devices.find((d) => d.name === drive.name);

                    return <InstallationDevice key={i} drive={drive} device={device} />;
                  })}

                  {/* <Card isPlain> */}
                  {/*   <CardHeader */}
                  {/*     actions={{ */}
                  {/*       actions: ( */}
                  {/*         <> */}
                  {/*           <Button variant="secondary">{_("Change device")}</Button> */}
                  {/*           <Dropdown */}
                  {/*             toggle={(ref) => ( */}
                  {/*               <MenuToggle ref={ref} variant="plain"> */}
                  {/*                 {_("More actions")} <Icon name="more_vert" /> */}
                  {/*               </MenuToggle> */}
                  {/*             )} */}
                  {/*           /> */}
                  {/*         </> */}
                  {/*       ), */}
                  {/*     }} */}
                  {/*   > */}
                  {/*     <CardTitle> */}
                  {/*       <h4> */}
                  {/*         <Split hasGutter> */}
                  {/*           <div>{_("/dev/vdb")}</div> */}
                  {/*           <Label isCompact>{_("Seagate")}</Label> */}
                  {/*           <Label isCompact variant="outline"> */}
                  {/*             {_("1 TiB")} */}
                  {/*           </Label> */}
                  {/*         </Split> */}
                  {/*       </h4> */}
                  {/*     </CardTitle> */}
                  {/*   </CardHeader> */}
                  {/*   <CardBody> */}
                  {/*     <DescriptionList isHorizontal isCompact> */}
                  {/*       <DescriptionListGroup> */}
                  {/*         <DescriptionListTerm>{_("Current content")}</DescriptionListTerm> */}
                  {/*         <DescriptionListDescription> */}
                  {/*           {_("Existing partitions will be kept")}{" "} */}
                  {/*         </DescriptionListDescription> */}
                  {/*       </DescriptionListGroup> */}
                  {/*       <DescriptionListGroup> */}
                  {/*         <DescriptionListTerm>{_("New content")}</DescriptionListTerm> */}
                  {/*         <DescriptionListDescription> */}
                  {/*           <List isPlain> */}
                  {/*             <ListItem>{_("Btrfs root 1TiB")} </ListItem> */}
                  {/*             <ListItem>{_("XFS /home 2TiB")}</ListItem> */}
                  {/*           </List> */}
                  {/*         </DescriptionListDescription> */}
                  {/*       </DescriptionListGroup> */}
                  {/*     </DescriptionList> */}
                  {/*   </CardBody> */}
                  {/* </Card> */}
                </ListItem>
              </List>

              {/*   <Divider component="hr" /> */}
              {/*   {drives.map((drive, i) => { */}
              {/*     const device = devices.find((d) => d.name === drive.name); */}
              {/**/}
              {/*     return ( */}
              {/*       <> */}
              {/*         Put <NewContentSelector device={drive} /> at <DriveSelector selected={drive} />{" "} */}
              {/*         by{" "} */}
              {/*         <CurrentContentActionsSelector */}
              {/*           device={drive} */}
              {/*           currentAction={SPACE_POLICIES[0]} */}
              {/*         /> */}
              {/*       </> */}
              {/*     ); */}
              {/*   })} */}
            </Page.Section>
          </GridItem>
        </Grid>
      </Page.Content>
    </Page>
  );
}
