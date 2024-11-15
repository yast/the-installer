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
import React from "react";
import {
  Menu,
  MenuContent,
  MenuList,
  MenuItem,
  Divider,
  DrilldownMenu,
  MenuToggle,
  MenuContainer,
  MenuGroup,
  MenuItemAction,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbHeading,
  MenuBreadcrumb,
} from "@patternfly/react-core";
import { Icon } from "../layout";

export default function InstalaltionDeviceActionsMenu({ device }) {
  const menuRef = React.useRef();
  const toggleRef = React.useRef();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [menuDrilledIn, setMenuDrilledIn] = React.useState<string[]>([]);
  const [drilldownPath, setDrilldownPath] = React.useState<string[]>([]);
  const [menuHeights, setMenuHeights] = React.useState<any>({});
  const [activeMenu, setActiveMenu] = React.useState<string>("drilldown-rootMenu");
  const [spacePolicy, setSpacePolicy] = React.useState<string>("");
  // const [autoFocusOn, setAutoFocusOn] = React.useState<string>("");
  const [breadcrumb, setBreadcrumb] = React.useState<JSX.Element | null>();

  // const drillIn = (
  //   _event: React.KeyboardEvent | React.MouseEvent,
  //   fromMenuId: string,
  //   toMenuId: string,
  //   pathId: string,
  // ) => {
  //   console.log("fromMenuId", fromMenuId, "toMenuId", toMenuId, "pathId", pathId);
  //   setMenuDrilledIn([...menuDrilledIn, fromMenuId]);
  //   setDrilldownPath([...drilldownPath, pathId]);
  //   setActiveMenu(toMenuId);
  // };

  const drillIn = (
    _event: React.KeyboardEvent | React.MouseEvent,
    fromMenuId: string,
    toMenuId: string,
    pathId: string,
  ) => {
    setMenuDrilledIn([...menuDrilledIn, fromMenuId]);
    setDrilldownPath([...drilldownPath, pathId]);
    setActiveMenu(toMenuId);
  };

  const drillOut = (
    _event: React.KeyboardEvent<Element> | MouseEvent | React.MouseEvent<any, MouseEvent>,
    toMenuId: string,
    fromPathId: string,
    breadcrumb: JSX.Element | null,
  ) => {
    setMenuDrilledIn((prevMenuDrilledIn) => {
      const indexOfMenuId = prevMenuDrilledIn.indexOf(toMenuId);
      const result = prevMenuDrilledIn.slice(0, indexOfMenuId);
      return result;
    });
    setDrilldownPath((prevDrilldownPath) => {
      const indexOfMenuIdPath = prevDrilldownPath.indexOf(fromPathId);
      const result = prevDrilldownPath.slice(0, indexOfMenuIdPath);
      return result;
    });
    setActiveMenu(toMenuId);
    setBreadcrumb(breadcrumb);
  };

  // const drillOut = (_event: React.KeyboardEvent | React.MouseEvent, toMenuId: string) => {
  //   const menuDrilledInSansLast = menuDrilledIn.slice(0, menuDrilledIn.length - 1);
  //   console.log("drillDownPath", drilldownPath);
  //   const [lastPath, ...remainingPath] = drilldownPath.reverse();
  //   setMenuDrilledIn(menuDrilledInSansLast);
  //   setDrilldownPath(remainingPath.reverse());
  //   setActiveMenu(toMenuId);
  //   setAutoFocusOn(lastPath);
  // };
  //
  const rootMenuId = `device-${device.id}-actions-menu`;

  const setHeight = (menuId: string, height: number) => {
    console.log("setHeight", menuId, height);
    if (
      menuHeights[menuId] === undefined ||
      (menuId !== rootMenuId && menuHeights[menuId] !== height)
    ) {
      setMenuHeights({ ...menuHeights, [menuId]: height });
    }
  };

  const onToggleClick = () => setIsOpen(!isOpen);

  const currentContentBreadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem
        component="button"
        onClick={(event: any) => {
          event.stopPropagation();
          drillOut(event, rootMenuId, "group-currentContent", null);
        }}
      >
        {device.mountPoint}
      </BreadcrumbItem>
      <BreadcrumbItem>Current content</BreadcrumbItem>
    </Breadcrumb>
  );

  const newContentBreadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem
        component="button"
        onClick={(event: any) => {
          event.stopPropagation();
          drillOut(event, rootMenuId, "group-newContent", null);
        }}
      >
        {device.mountPoint}
      </BreadcrumbItem>
      <BreadcrumbHeading component="button">New content</BreadcrumbHeading>
    </Breadcrumb>
  );

  const toggle = (
    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
      More actions
    </MenuToggle>
  );

  const menu = (
    <Menu
      id={rootMenuId}
      containsDrilldown
      drilldownItemPath={drilldownPath}
      drilledInMenus={menuDrilledIn}
      activeMenu={activeMenu}
      onDrillIn={drillIn}
      onGetMenuHeight={setHeight}
      ref={menuRef}
    >
      {breadcrumb && (
        <>
          <MenuBreadcrumb>{breadcrumb}</MenuBreadcrumb>
          <Divider />
        </>
      )}
      <MenuContent menuHeight={`${menuHeights[activeMenu]}px`}>
        <MenuList>
          <MenuItem
            // isFocused={autoFocusOn === "group-currentContent"}
            itemId="group-currentContent"
            direction="down"
            description="Choose how to deal with current content"
            onClick={() => setBreadcrumb(currentContentBreadcrumb)}
            drilldownMenu={
              <DrilldownMenu id="drilldown-currentContent">
                <MenuItem
                  itemId="currentContent-delete"
                  isSelected={spacePolicy === "delete"}
                  description="All partitions will be removed and any data in the disks will be lost."
                  onClick={() => setSpacePolicy("delete")}
                >
                  Delete
                </MenuItem>
                <MenuItem
                  itemId="currentContent-shrink"
                  description="The data is kept, but the current partitions will be resized as needed."
                  isSelected={spacePolicy === "shrink"}
                  onClick={() => setSpacePolicy("shrink")}
                >
                  Shrink as needed
                </MenuItem>
                <MenuItem
                  itemId="currentContent-keep"
                  description="The data is kept. Only the space not assigned to any partition will be used"
                  isSelected={spacePolicy === "keep"}
                  onClick={() => setSpacePolicy("keep")}
                >
                  Use available space
                </MenuItem>
                <MenuItem
                  itemId="currentContent-custom"
                  description="Select what to do with each partition."
                  isSelected={spacePolicy === "custom"}
                  onClick={() => setSpacePolicy("custom")}
                >
                  Custom
                </MenuItem>
              </DrilldownMenu>
            }
          >
            Current content
          </MenuItem>
          <MenuItem
            // isFocused={autoFocusOn === "group-newContent"}
            itemId="group-newContent"
            direction="down"
            description="Add, edit, or remove partitions"
            onClick={() => setBreadcrumb(newContentBreadcrumb)}
            drilldownMenu={
              <DrilldownMenu id="newContentMenu">
                <MenuItem itemId="newContent-addPartition">Add Partition</MenuItem>
                <Divider />
                <MenuItem
                  component="span"
                  itemId="newContent-root"
                  actions={
                    <>
                      <MenuItemAction
                        icon={<Icon name="edit_square" size="xs" />}
                        aria-label="Edit root partition"
                      />
                      <MenuItemAction
                        icon={<Icon name="apps" size="xs" />}
                        aria-label="Change root location"
                      />
                      <MenuItemAction
                        icon={<Icon name="delete" size="xs" />}
                        aria-label="Delete root location"
                      />
                    </>
                  }
                >
                  root
                </MenuItem>
                <MenuGroup label="root">
                  <MenuItem itemId="newContent-root-edit">Edit</MenuItem>
                  <MenuItem itemId="newContent-root-changeLocation">Change location</MenuItem>
                  <MenuItem isDanger itemId="newContent-root-delete">
                    Delete
                  </MenuItem>
                </MenuGroup>
                <Divider />
                <MenuGroup label="swap">
                  <MenuItem itemId="newContent-swap-edit">Edit</MenuItem>
                  <MenuItem isDanger itemId="newContent-swap-delete">
                    Delete
                  </MenuItem>
                </MenuGroup>
              </DrilldownMenu>
            }
          >
            New content
          </MenuItem>
          <Divider component="li" />
          <MenuItem itemId="device-delete" isDanger>
            Do not use
          </MenuItem>
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      menu={menu}
      menuRef={menuRef}
      toggle={toggle}
      toggleRef={toggleRef}
      popperProps={{ position: "right" }}
    />
  );
}
// import React from "react";
// import {
//   MenuToggle,
//   Menu,
//   MenuContent,
//   MenuList,
//   MenuItem,
//   DrilldownMenu,
//   Divider,
//   MenuContainer,
// } from "@patternfly/react-core";
// import StorageDomainIcon from "@patternfly/react-icons/dist/esm/icons/storage-domain-icon";
// import CodeBranchIcon from "@patternfly/react-icons/dist/esm/icons/code-branch-icon";
// import LayerGroupIcon from "@patternfly/react-icons/dist/esm/icons/layer-group-icon";
// import CubeIcon from "@patternfly/react-icons/dist/esm/icons/cube-icon";
// import { Icon } from "../layout";
//
// interface MenuHeightsType {
//   [id: string]: number;
// }
//
// export const DrilldownMenuDemo: React.FunctionComponent = () => {
//   const [isOpen, setIsOpen] = React.useState<boolean>(false);
//   const [activeMenu, setActiveMenu] = React.useState<string>("rootMenu");
//   const [menuDrilledIn, setMenuDrilledIn] = React.useState<string[]>([]);
//   const [drilldownPath, setDrilldownPath] = React.useState<string[]>([]);
//   const [menuHeights, setMenuHeights] = React.useState<MenuHeightsType>({});
//   const toggleRef = React.useRef<HTMLButtonElement>(null);
//   const menuRef = React.useRef<HTMLDivElement>(null);
//
//   const onToggleClick = () => {
//     setIsOpen(!isOpen);
//     setMenuDrilledIn([]);
//     setDrilldownPath([]);
//     setActiveMenu("rootMenu");
//   };
//
//   const drillIn = (
//     _event: React.KeyboardEvent | React.MouseEvent,
//     fromMenuId: string,
//     toMenuId: string,
//     pathId: string,
//   ) => {
//     setMenuDrilledIn([...menuDrilledIn, fromMenuId]);
//     setDrilldownPath([...drilldownPath, pathId]);
//     setActiveMenu(toMenuId);
//   };
//
//   const drillOut = (_event: React.KeyboardEvent | React.MouseEvent, toMenuId: string) => {
//     console.log("drilldownPath before", drilldownPath);
//     setMenuDrilledIn(menuDrilledIn.slice(0, menuDrilledIn.length - 1));
//     setDrilldownPath(drilldownPath.slice(0, drilldownPath.length - 1));
//     setActiveMenu(toMenuId);
//     console.log("drilldownPath after", drilldownPath);
//   };
//
//   const setHeight = (menuId: string, height: number) => {
//     if (!menuHeights[menuId] || (menuId !== "rootMenu" && menuHeights[menuId] !== height)) {
//       setMenuHeights({
//         ...menuHeights,
//         [menuId]: height,
//       });
//     }
//   };
//
//   const toggle = (
//     <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
//       {isOpen ? "Expanded" : "Collapsed"}
//     </MenuToggle>
//   );
//   const menu = (
//     <Menu
//       id="rootMenu"
//       containsDrilldown
//       drilldownItemPath={drilldownPath}
//       drilledInMenus={menuDrilledIn}
//       activeMenu={activeMenu}
//       onDrillIn={drillIn}
//       onDrillOut={drillOut}
//       onGetMenuHeight={setHeight}
//       ref={menuRef}
//     >
//       <MenuContent menuHeight={`${menuHeights[activeMenu]}px`}>
//         <MenuList>
//           <MenuItem
//             itemId="group:start_rollout"
//             direction="down"
//             drilldownMenu={
//               <DrilldownMenu id="drilldownMenuStart">
//                 <MenuItem itemId="group:start_rollout_breadcrumb" direction="up">
//                   Start rollout
//                 </MenuItem>
//                 <Divider component="li" />
//                 <MenuItem
//                   itemId="group:app_grouping"
//                   description="Groups A-C"
//                   direction="down"
//                   drilldownMenu={
//                     <DrilldownMenu id="drilldownMenuStartGrouping">
//                       <MenuItem itemId="group:app_grouping_breadcrumb" direction="up">
//                         Application Grouping
//                       </MenuItem>
//                       <Divider component="li" />
//                       <MenuItem itemId="group_a">Group A</MenuItem>
//                       <MenuItem itemId="group_b">Group B</MenuItem>
//                       <MenuItem itemId="group_c">Group C</MenuItem>
//                     </DrilldownMenu>
//                   }
//                 >
//                   Application Grouping
//                 </MenuItem>
//                 <MenuItem itemId="count">Count</MenuItem>
//                 <MenuItem
//                   itemId="group:labels"
//                   direction="down"
//                   drilldownMenu={
//                     <DrilldownMenu id="drilldownMenuStartLabels">
//                       <MenuItem itemId="group:labels_breadcrumb" direction="up">
//                         Labels
//                       </MenuItem>
//                       <Divider component="li" />
//                       <MenuItem itemId="label_1">Label 1</MenuItem>
//                       <MenuItem itemId="label_2">Label 2</MenuItem>
//                       <MenuItem itemId="label_3">Label 3</MenuItem>
//                     </DrilldownMenu>
//                   }
//                 >
//                   Labels
//                 </MenuItem>
//                 <MenuItem itemId="annotations">Annotations</MenuItem>
//               </DrilldownMenu>
//             }
//           >
//             Start rollout
//           </MenuItem>
//           <MenuItem
//             itemId="group:pause_rollout"
//             direction="down"
//             drilldownMenu={
//               <DrilldownMenu id="drilldownMenuPause">
//                 <MenuItem itemId="group:pause_rollout_breadcrumb" direction="up">
//                   Pause rollouts
//                 </MenuItem>
//                 <Divider component="li" />
//                 <MenuItem
//                   itemId="group:app_grouping"
//                   description="Groups A-C"
//                   direction="down"
//                   drilldownMenu={
//                     <DrilldownMenu id="drilldownMenuGrouping">
//                       <MenuItem itemId="group:app_grouping_breadcrumb" direction="up">
//                         Application Grouping
//                       </MenuItem>
//                       <Divider component="li" />
//                       <MenuItem itemId="group_a">Group A</MenuItem>
//                       <MenuItem itemId="group_b">Group B</MenuItem>
//                       <MenuItem itemId="group_c">Group C</MenuItem>
//                     </DrilldownMenu>
//                   }
//                 >
//                   Application Grouping
//                 </MenuItem>
//                 <MenuItem itemId="count">Count</MenuItem>
//                 <MenuItem
//                   itemId="group:labels"
//                   direction="down"
//                   drilldownMenu={
//                     <DrilldownMenu id="drilldownMenuLabels">
//                       <MenuItem itemId="group:labels_breadcrumb" direction="up">
//                         Labels
//                       </MenuItem>
//                       <Divider component="li" />
//                       <MenuItem itemId="label_1">Label 1</MenuItem>
//                       <MenuItem itemId="label_2">Label 2</MenuItem>
//                       <MenuItem itemId="label_3">Label 3</MenuItem>
//                     </DrilldownMenu>
//                   }
//                 >
//                   Labels
//                 </MenuItem>
//                 <MenuItem itemId="annotations">Annotations</MenuItem>
//               </DrilldownMenu>
//             }
//           >
//             Pause rollouts
//           </MenuItem>
//           <MenuItem
//             itemId="group:storage"
//             icon={<StorageDomainIcon aria-hidden />}
//             direction="down"
//             drilldownMenu={
//               <DrilldownMenu id="drilldownMenuStorage">
//                 <MenuItem
//                   itemId="group:storage_breadcrumb"
//                   icon={<StorageDomainIcon aria-hidden />}
//                   direction="up"
//                 >
//                   Add storage
//                 </MenuItem>
//                 <Divider component="li" />
//                 <MenuItem icon={<CodeBranchIcon aria-hidden />} itemId="git">
//                   From Git
//                 </MenuItem>
//                 <MenuItem icon={<LayerGroupIcon aria-hidden />} itemId="container">
//                   Container Image
//                 </MenuItem>
//                 <MenuItem icon={<CubeIcon aria-hidden />} itemId="docker">
//                   Docker File
//                 </MenuItem>
//               </DrilldownMenu>
//             }
//           >
//             Add storage
//           </MenuItem>
//           <MenuItem itemId="edit">Edit</MenuItem>
//           <MenuItem itemId="delete_deployment">Delete deployment config</MenuItem>
//         </MenuList>
//       </MenuContent>
//     </Menu>
//   );
//   return (
//     <MenuContainer
//       isOpen={isOpen}
//       onOpenChange={(isOpen) => setIsOpen(isOpen)}
//       menu={menu}
//       menuRef={menuRef}
//       toggle={toggle}
//       toggleRef={toggleRef}
//     />
//   );
// };
