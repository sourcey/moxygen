/// @addtogroup webrtc
/// @{

#pragma once

#include "base.h"
#include "uv.h"

namespace demo {

/// Session type documented in a different group from PacketStream.
class PeerSession
{
public:
    /// Attaches the session to @ref demo::PacketStream.
    void attach(PacketStream& stream);

    /// Binds the session to @ref demo::uv::Loop.
    void bindLoop(uv::Loop* loop);
};

} // namespace demo

/// @}
