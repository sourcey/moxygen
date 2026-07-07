{#byciclemodule}

# Bycicle module

Bicycle module contains the bicycle class. Bicycles are a useful way of transporting oneself, without too much effort.

### Classes

| Name | Description |
|------|-------------|
| [`Bicycle`](#bicycle) | Standard bicycle class. |

{#bicycle}

## Bicycle

```cpp
#include <bicycle.h>
```

```cpp
class Bicycle
```

Defined in src/bicycle.h:17

> **Subclassed by:** [`MountainBike`](api-mountainbike.md#mountainbike), [`RacingBike`](api-racingbike.md#racingbike)

Standard bicycle class.

[Bicycle](#bicycle) implements a standard bicycle. Bicycles are a useful way of transporting oneself, without too much effort (unless you go uphill or against the wind). If there are a lot of people on the road, you can use `RingBell` to ring your bell (**note**, not all bicycles have bells!).

### List of all members

| Name | Kind | Owner |
|------|------|-------|
| [`PedalHarder`](#pedalharder) | `function` | Declared here |
| [`RingBell`](#ringbell) | `function` | Declared here |
| [`~Bicycle`](#bicycle-1) | `function` | Declared here |

### Public Methods

| Return | Name | Description |
|--------|------|-------------|
| `void` | [`PedalHarder`](#pedalharder) `virtual` | PedalHarder makes you go faster (usually). |
| `void` | [`RingBell`](#ringbell) `virtual` | Ring bell on the bike. |
|  | [`~Bicycle`](#bicycle-1) `virtual` | Default destructor. |

---

{#pedalharder}

#### PedalHarder

`virtual`

```cpp
virtual void PedalHarder()
```

Defined in src/bicycle.h:20

PedalHarder makes you go faster (usually).

##### Reimplemented by

- [`PedalHarder`](api-racingbike.md#pedalharder-1)

---

{#ringbell}

#### RingBell

`virtual`

```cpp
virtual void RingBell()
```

Defined in src/bicycle.h:27

Ring bell on the bike.

RingBell rings the bell on the bike. Note that not all bikes have bells.

##### Reimplemented by

- [`RingBell`](api-racingbike.md#ringbell-1)

---

{#bicycle-1}

#### ~Bicycle

`virtual`

```cpp
virtual ~Bicycle()
```

Defined in src/bicycle.h:30

Default destructor.

