/// @addtogroup net
/// @{

#pragma once

#include "base.h"

namespace demo {

/// JSON helpers for the net module.
namespace json {

/// A parsed JSON document.
using Value = std::vector<char>;

} // namespace json

/// Sends packets.
class Socket
{
public:
    /// Sends a `Buffer` in `Mode::Safe`, as `send(Buffer&)` and a `json::Value` do.
    void send(Buffer& data);
};

/// Parses a `json::Value` from a `Buffer`.
json::Value parse(const Buffer& data);

} // namespace demo

/// @}
