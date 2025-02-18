# frozen_string_literal: true

# Copyright (c) [2021-2023] SUSE LLC
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

require "yast"
require "agama/question"

Yast.import "Pkg"

module Agama
  module Software
    module Callbacks
      # Callbacks related to media handling
      class Media
        # Constructor
        #
        # @param questions_client [Agama::DBus::Clients::Questions]
        # @param logger [Logger]
        def initialize(questions_client, logger)
          @questions_client = questions_client
          @logger = logger
        end

        # Register the callbacks
        def setup
          Yast::Pkg.CallbackMediaChange(
            Yast::FunRef.new(
              method(:media_change),
              "string (string, string, string, string, integer, string, integer, string, " \
              "boolean, list <string>, integer)"
            )
          )
        end

        # Media change callback
        #
        # @return [String]
        # @see https://github.com/yast/yast-yast2/blob/19180445ab935a25edd4ae0243aa7a3bcd09c9de/library/packages/src/modules/PackageCallbacks.rb#L620
        # rubocop:disable Metrics/ParameterLists
        def media_change(error_code, error, url, product, current, current_label, wanted,
          wanted_label, double_sided, devices, current_device)
          logger.debug(
            format("MediaChange callback: error_code: %s, error: %s, url: %s, product: %s, " \
                   "current: %s, current_label: %s, wanted: %s, wanted_label: %s, " \
                   "double_sided: %s, devices: %s, current_device",
              error_code,
              error,
              Yast::URL.HidePassword(url),
              product,
              current,
              current_label,
              wanted,
              wanted_label,
              double_sided,
              devices,
              current_device)
          )

          question = Agama::Question.new(
            qclass:         "software.medium_error",
            text:           error,
            options:        [:Retry, :Skip],
            default_option: :Skip,
            data:           { "url" => url }
          )
          questions_client.ask(question) do |question_client|
            (question_client.answer == :Retry) ? "" : "S"
          end
        end
      # rubocop:enable Metrics/ParameterLists

      private

        # @return [Agama::DBus::Clients::Questions]
        attr_reader :questions_client

        # @return [Logger]
        attr_reader :logger
      end
    end
  end
end
