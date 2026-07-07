{#racingbikemodule}

# Racing bike module

Racing bike module contains the `RacingBike` class. Racing bikes are a special kind of bike which can go much faster on the road, with much less effort.

### Classes

| Name | Description |
|------|-------------|
| [`RacingBike`](#racingbike) | Racing bike class. |

{#racingbike}

## RacingBike

```cpp
#include <racingbike.h>
```

```cpp
class RacingBike
```

Defined in src/racingbike.h:17

> **Inherits:** [`Bicycle`](api-bicycle.md#bicycle)

Racing bike class.

[RacingBike](#racingbike) is a special kind of bike which can go much faster on the road, with much less effort (even uphill!). It doesn't make sense to call `RingBell` on a racing bike for they don't have bells.

### List of all members

| Name | Kind | Owner |
|------|------|-------|
| [`PedalHarder`](#pedalharder-1) | `function` | Declared here |
| [`RingBell`](#ringbell-1) | `function` | Declared here |
| [`PedalHarder`](api-bicycle.md#pedalharder) | `function` | Inherited from [`Bicycle`](api-bicycle.md#bicycle) |
| [`RingBell`](api-bicycle.md#ringbell) | `function` | Inherited from [`Bicycle`](api-bicycle.md#bicycle) |
| [`~Bicycle`](api-bicycle.md#bicycle-1) | `function` | Inherited from [`Bicycle`](api-bicycle.md#bicycle) |

### Inherited from [`Bicycle`](api-bicycle.md#bicycle)

| Kind | Name | Description |
|------|------|-------------|
| `function` | [`PedalHarder`](api-bicycle.md#pedalharder) `virtual` | PedalHarder makes you go faster (usually). |
| `function` | [`RingBell`](api-bicycle.md#ringbell) `virtual` | Ring bell on the bike. |
| `function` | [`~Bicycle`](api-bicycle.md#bicycle-1) `virtual` | Default destructor. |

### Public Methods

| Return | Name | Description |
|--------|------|-------------|
| `void` | [`PedalHarder`](#pedalharder-1) `virtual` | PedalHarder makes you go faster (usually). |
| `void` | [`RingBell`](#ringbell-1) `virtual` | Ring bell on the bike. |

---

{#pedalharder-1}

#### PedalHarder

`virtual`

```cpp
virtual void PedalHarder()
```

Defined in src/racingbike.h:20

PedalHarder makes you go faster (usually).

##### Reimplements

- [`PedalHarder`](api-bicycle.md#pedalharder)

---

{#ringbell-1}

#### RingBell

`virtual`

```cpp
virtual void RingBell()
```

Defined in src/racingbike.h:23

Ring bell on the bike.

RingBell rings the bell on the bike. Note that not all bikes have bells.

##### Reimplements

- [`RingBell`](api-bicycle.md#ringbell)

