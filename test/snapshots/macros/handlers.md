{#handlers}

# handlers

```cpp
#include <macros.h>
```

```cpp
struct handlers
```

Defined in src/macros.h:78

Registry of handler hooks.

## Public Attributes

| Return | Name | Description |
|--------|------|-------------|
| `int(*` | [`retry`](#retry)  | Called when a retry is scheduled. |
| struct [`handlers`](#handlers) * | [`fallback`](#fallback)  | The registry consulted when this one has no handler. |

---

{#retry}

### retry

```cpp
int(* retry)(int attempt, const char *reason)
```

Defined in src/macros.h:86

Called when a retry is scheduled.

#### Returns
zero to stop retrying

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `attempt` |  | the attempt number, starting at one |
| `reason` |  | why the retry was scheduled |

---

{#fallback}

### fallback

```cpp
struct handlers * fallback
```

Type: struct [`handlers`](#handlers) *

Defined in src/macros.h:89

The registry consulted when this one has no handler.

