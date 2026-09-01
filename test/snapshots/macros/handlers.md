{#handlers}

# handlers

```cpp
#include <macros.h>
```

```cpp
struct handlers
```

Defined in src/macros.h:33

Registry of handler hooks.

## List of all members

| Name | Kind | Owner |
|------|------|-------|
| [`retry`](#retry) | `variable` | Declared here |

## Public Attributes

| Return | Name | Description |
|--------|------|-------------|
| `int(*` | [`retry`](#retry)  | Called when a retry is scheduled. |

---

{#retry}

### retry

```cpp
int(* retry)(int attempt, const char *reason)
```

Defined in src/macros.h:41

Called when a retry is scheduled.

#### Returns
zero to stop retrying

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `attempt` |  | the attempt number, starting at one |
| `reason` |  | why the retry was scheduled |

