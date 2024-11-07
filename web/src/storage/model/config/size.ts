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

import { config } from "~/api/storage/types";
import * as checks from "~/api/storage/types/checks";

export type Size = {
  min?: number;
  max?: number;
};

export interface WithSize {
  size?: config.Size;
}

class SizeGenerator<TypeWithSize extends WithSize> {
  private config: TypeWithSize;

  constructor(config: TypeWithSize) {
    this.config = config;
  }

  // TODO: detect auto size by checking the unsolved config.
  generate(): Size | undefined {
    const size = this.config.size;

    if (!size) return;
    if (checks.isSizeValue(size)) return this.fromSizeValue(size);
    if (checks.isSizeTuple(size)) return this.fromSizeTuple(size);
    if (checks.isSizeRange(size)) return this.fromSizeRange(size);
  }

  private fromSizeValue(value: config.SizeValue): Size {
    const bytes = this.bytes(value);
    return { min: bytes, max: bytes };
  }

  private fromSizeTuple(sizeTuple: config.SizeTuple): Size {
    const size: Size = { min: this.bytes(sizeTuple[0]) };
    if (sizeTuple.length === 2) size.max = this.bytes(sizeTuple[1]);

    return size;
  }

  private fromSizeRange(sizeRange: config.SizeRange): Size {
    const size: Size = { min: this.bytes(sizeRange.min) };
    if (sizeRange.max) size.max = this.bytes(sizeRange.max);

    return size;
  }

  private bytes(value: config.SizeValueWithCurrent): number | undefined {
    if (checks.isSizeCurrent(value)) return;
    // TODO: bytes from string.
    if (checks.isSizeString(value)) return;
    if (checks.isSizeBytes(value)) return value;
  }
}

export function generate<TypeWithSize extends WithSize>(config: TypeWithSize): Size | undefined {
  return new SizeGenerator<TypeWithSize>(config).generate();
}
