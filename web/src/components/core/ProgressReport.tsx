/*
 * Copyright (c) [2022-2025] SUSE LLC
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

import React, { useEffect, useState } from "react";
import {
  Bullseye,
  Card,
  CardBody,
  Flex,
  Grid,
  GridItem,
  ProgressStep,
  ProgressStepper,
  ProgressStepProps,
  Spinner,
  Stack,
  Truncate,
} from "@patternfly/react-core";

import { _ } from "~/i18n";
import { useProgress, useProgressChanges, useResetProgress } from "~/queries/progress";
import { Progress as ProgressType } from "~/types/progress";

type StepProps = {
  id: string;
  titleId: string;
  isCurrent: boolean;
  variant?: ProgressStepProps["variant"];
  description?: ProgressStepProps["description"];
};

const Progress = ({ steps, step, firstStep, detail }) => {
  const stepProperties = (stepNumber: number): StepProps => {
    const properties: StepProps = {
      isCurrent: stepNumber === step.current,
      id: `step-${stepNumber}-id`,
      titleId: `step-${stepNumber}-title`,
    };

    if (stepNumber > step.current) {
      properties.variant = "pending";
      properties.description = <div>{_("Pending")}</div>;
    }

    if (properties.isCurrent) {
      properties.variant = "info";
      if (detail && detail.message !== "") {
        const { message, current, total } = detail;
        properties.description = (
          <Stack hasGutter>
            <div>{_("In progress")}</div>
            <div>
              <Truncate
                content={`${message} (${current}/${total})`}
                trailingNumChars={12}
                position="middle"
              />
            </div>
          </Stack>
        );
      }
    }

    if (stepNumber < step.current || step.finished) {
      properties.variant = "success";
      properties.description = <div>{_("Finished")}</div>;
    }

    return properties;
  };

  return (
    <ProgressStepper isCenterAligned className="progress-report">
      {firstStep && (
        <ProgressStep key="initial" variant="success">
          {firstStep}
        </ProgressStep>
      )}
      {steps.map((description: StepProps["description"], idx: number) => {
        return (
          <ProgressStep key={idx} {...stepProperties(idx + 1)}>
            {description}
          </ProgressStep>
        );
      })}
    </ProgressStepper>
  );
};

function findDetail(progresses: ProgressType[]) {
  return progresses.find((progress) => {
    return progress?.finished === false;
  });
}

/**
 * Shows progress steps when a product is selected.
 */
function ProgressReport({ title, firstStep }: { title: string; firstStep?: React.ReactNode }) {
  useResetProgress();
  const progress = useProgress("manager", { suspense: true });
  const [steps, setSteps] = useState(progress.steps);
  const softwareProgress = useProgress("software");
  const storageProgress = useProgress("storage");
  useProgressChanges();

  useEffect(() => {
    if (progress.steps.length === 0) return;

    setSteps(progress.steps);
  }, [progress, steps]);
  const detail = findDetail([softwareProgress, storageProgress]);

  const Content = () => (
    <Progress steps={steps} step={progress} detail={detail} firstStep={firstStep} />
  );

  return (
    <Bullseye>
      <Grid hasGutter>
        <GridItem sm={10} smOffset={1}>
          <Card isPlain>
            <CardBody>
              <Flex
                direction={{ default: "column" }}
                rowGap={{ default: "rowGap2xl" }}
                alignItems={{ default: "alignItemsCenter" }}
              >
                <Spinner size="xl" />
                <h1 id="progress-title" style={{ textAlign: "center" }}>
                  {title}
                </h1>
                <Content />
              </Flex>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Bullseye>
  );
}

export default ProgressReport;
