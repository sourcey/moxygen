#pragma once

// Undocumented, and holding no types or members of its own: it only wraps the library.
namespace acme {

/// Networking for the library.
namespace net {

/// Transport internals.
namespace detail {

/// A buffer of bytes.
class Buffer
{
public:
    /// Empties the buffer.
    void clear();
};

} // namespace detail

/// A connection to a peer.
class Connection
{
public:
    /// Opens the connection.
    void open();
};

} // namespace net

} // namespace acme

/// A counter outside every namespace.
class Counter
{
public:
    /// Adds one.
    void increment();
};

/// Two coordinates, stored either way.
union Point
{
    int xy[2];   ///< Each coordinate.
    long packed; ///< Both coordinates in one word.
};

/// The largest count a Counter holds.
#define COUNTER_MAX 1024

/// Resets every counter.
void reset_all();
