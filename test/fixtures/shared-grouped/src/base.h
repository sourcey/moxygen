/// @addtogroup base
/// @{

#pragma once

namespace demo {

/// Packet pipeline primitive owned by the base module.
class PacketStream
{
public:
    /// Returns a stable identifier.
    int id() const;
};

} // namespace demo

/// @}
