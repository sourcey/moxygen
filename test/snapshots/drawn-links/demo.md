{#demo}

# demo

## Classes

| Name | Description |
|------|-------------|
| [`Socket`](demo-Socket.md#socket) | Sends packets. |
| [`Stream`](demo-Stream.md#stream) | Reads packets in a [`Mode`](base.md#mode). |

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

## Functions

| Return | Name | Description |
|--------|------|-------------|
| [`json::Value`](demo-json.md#value) | [`parse`](#parse)  | Parses a [`json::Value`](demo-json.md#value) from a [`Buffer`](base.md#buffer). |

---

{#parse}

### parse

```cpp
json::Value parse(const Buffer & data)
```

Defined in src/net.h:27

Parses a [`json::Value`](demo-json.md#value) from a [`Buffer`](base.md#buffer).

