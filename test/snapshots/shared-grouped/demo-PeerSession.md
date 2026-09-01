{#peersession}

# PeerSession

```cpp
#include <webrtc.h>
```

```cpp
class PeerSession
```

Defined in src/webrtc.h:12

Session type documented in a different group from [PacketStream](demo-PacketStream.md#packetstream).

## List of all members

| Name | Kind | Owner |
|------|------|-------|
| [`attach`](#attach) | `function` | Declared here |
| [`bindLoop`](#bindloop) | `function` | Declared here |

## Public Methods

| Return | Name | Description |
|--------|------|-------------|
| `void` | [`attach`](#attach)  | Attaches the session to [demo::PacketStream](demo-PacketStream.md#packetstream). |
| `void` | [`bindLoop`](#bindloop)  | Binds the session to [demo::uv::Loop](demo-uv.md#loop). |

---

{#attach}

### attach

```cpp
void attach(PacketStream & stream)
```

Defined in src/webrtc.h:16

Attaches the session to [demo::PacketStream](demo-PacketStream.md#packetstream).

---

{#bindloop}

### bindLoop

```cpp
void bindLoop(uv::Loop * loop)
```

Defined in src/webrtc.h:19

Binds the session to [demo::uv::Loop](demo-uv.md#loop).

