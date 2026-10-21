{#netmodule}

# Net module

Module page for the network types.

## Namespaces

| Name | Description |
|------|-------------|
| [`json`](demo-json.md#json) | JSON helpers for the net module. |

## Classes

| Name | Description |
|------|-------------|
| [`Socket`](demo-Socket.md#socket) | Sends packets. |

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

