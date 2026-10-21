{#basemodule}

# Base module

Module page for the shared base types.

## Classes

| Name | Description |
|------|-------------|
| [`Stream`](demo-Stream.md#stream) | Reads packets in a [`Mode`](#mode). |

## Enumerations

| Name | Description |
|------|-------------|
| [`Mode`](#mode)  | How a stream reads. |

---

{#mode}

### Mode

```cpp
enum Mode
```

Defined in src/base.h:15

How a stream reads.

| Value | Description |
|-------|-------------|
| `Fast` | Skips the checks. |
| `Safe` | Checks every packet. |
## Typedefs

| Return | Name | Description |
|--------|------|-------------|
| `std::vector< char >` | [`Buffer`](#buffer)  | Bytes owned by the base module. |

---

{#buffer}

### Buffer

```cpp
using Buffer = std::vector< char >
```

Defined in src/base.h:12

Bytes owned by the base module.

