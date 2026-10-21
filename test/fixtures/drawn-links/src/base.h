/// @addtogroup base
/// @{

#pragma once

#include <map>
#include <vector>

namespace demo {

/// Bytes owned by the base module.
using Buffer = std::vector<char>;

/// How a stream reads.
enum class Mode
{
    Fast, ///< Skips the checks.
    Safe  ///< Checks every packet.
};

/// Reads packets in a `Mode`.
class Stream
{
public:
    /// Reads into a `Buffer`.
    void read(Buffer& out);

protected:
    using Channels = std::map<int, Stream*>;

    /// Open channels by id.
    Channels channels;
};

} // namespace demo

/// @}
