# frozen_string_literal: true

# Copyright (c) [2022] SUSE LLC
#
# All Rights Reserved.
#
# This program is free software; you can redistribute it and/or modify it
# under the terms of version 2 of the GNU General Public License as published
# by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
# FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
# more details.
#
# You should have received a copy of the GNU General Public License along
# with this program; if not, contact SUSE LLC.
#
# To contact SUSE LLC about this file by physical or electronic mail, you may
# find current contact information at www.suse.com.

module DInstaller
  module Network
    # Represents a network connection
    #
    # It contains just the relevant parts for D-Installer.
    class Connection < Struct.new("Connection", :id, :path, :type, :state, :ipv4)
      module TYPE
        ETHERNET = "802-3-ethernet",
        WIFI = "802-11-wireless"
      end

      module STATE
        UNKWOWN = 0
        ACTIVATING = 1
        ACTIVATED = 2
        DEACTIVATING = 3
        DEACTIVATED = 4
      end

      # @!attribute [r] id
      #   @return [String] Connection ID
      #
      # @!attribute [r] path
      #   @return [String] Connection path in D-Bus (FIXME: do not expose the path)
      #
      # @!attribute [r] type
      #   @return [String] Connection type
      #   @see TYPE
      #
      # @!attribute [r] state
      #   @return [String] Connection state
      #   @see STATE
      #
      # @!attribute [r] ipv4
      #   @return [IPConfig]

      # Determines whether two connection objects are equivalent
      #
      # @param other [Connection] Object to compare with
      def ==(other)
        id == other.id && path == other.path && type == other.type &&
        state == other.state && ipv4 == other.ipv4
      end

      # Returns a hash representation to be used in D-Bus
      #
      # @return [Hash]
      def to_dbus
        {
          "id" => id,
          "path" => path,
          "type" => type,
          "state" => state,
          "ipv4" => ipv4.to_dbus
        }
      end
    end
  end
end
