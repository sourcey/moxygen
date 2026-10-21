{#socket}

# Socket

```cpp
#include <net.h>
```

```cpp
class Socket
```

Defined in src/net.h:19

Sends packets.

## Public Methods

| Return | Name | Description |
|--------|------|-------------|
| `void` | [`send`](#send)  | Sends a [`Buffer`](base.md#buffer) in [`Mode::Safe`](base.md#mode), as `send(Buffer&)` and a [`json::Value`](demo-json.md#value) do. |

---

{#send}

### send

```cpp
void send(Buffer & data)
```

Defined in src/net.h:23

Sends a [`Buffer`](base.md#buffer) in [`Mode::Safe`](base.md#mode), as `send(Buffer&)` and a [`json::Value`](demo-json.md#value) do.

