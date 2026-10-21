{#stream}

# Stream

```cpp
#include <base.h>
```

```cpp
class Stream
```

Defined in src/base.h:22

Reads packets in a [`Mode`](base.md#mode).

## Public Methods

| Return | Name | Description |
|--------|------|-------------|
| `void` | [`read`](#read)  | Reads into a [`Buffer`](base.md#buffer). |

---

{#read}

### read

```cpp
void read(Buffer & out)
```

Defined in src/base.h:26

Reads into a [`Buffer`](base.md#buffer).

## Protected Attributes

| Return | Name | Description |
|--------|------|-------------|
| `Channels` | [`channels`](#channels)  | Open channels by id. |

---

{#channels}

### channels

```cpp
Channels channels
```

Type: `Channels`

Defined in src/base.h:32

Open channels by id.

