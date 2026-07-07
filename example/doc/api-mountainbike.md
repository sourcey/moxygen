{#mountainbikemodule}

# Mountain bike module

Mountain bike module contains the `MountainBike` class. Mountain bikes are a kind of bike for cycling on rough terrain.

### Classes

| Name | Description |
|------|-------------|
| [`MountainBike`](#mountainbike) | Mountain bike implementation of a `[Bicycle](api-bicycle.md#bicycle)`. |

{#mountainbike}

## MountainBike

```cpp
#include <mountainbike.h>
```

```cpp
class MountainBike
```

Defined in src/mountainbike.h:20

> **Inherits:** [`Bicycle`](api-bicycle.md#bicycle)

Mountain bike implementation of a `[Bicycle](api-bicycle.md#bicycle)`.

[MountainBike](#mountainbike) is an implementation of a [Bicycle](api-bicycle.md#bicycle) providing a bike for cycling on rough terrain. Mountain bikes are pretty cool because they have stuff like **Suspension** (and you can even adjust it using SetSuspension). If you're looking for a bike for use on the road, you might be better off using a [RacingBike](api-racingbike.md#racingbike) though.

### List of all members

| Name | Kind | Owner |
|------|------|-------|
| [`SetSuspension`](#setsuspension) | `function` | Declared here |
| [`ChangeBreak`](#changebreak) | `function` | Declared here |
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
| `bool` | [`SetSuspension`](#setsuspension)  | Set suspension stiffness. the suspension stiffness. |
| `bool` | [`ChangeBreak`](#changebreak) `inline` | Change the break type. the break type. the type of the break. |

---

{#setsuspension}

#### SetSuspension

```cpp
bool SetSuspension(double stiffness)
```

Defined in src/mountainbike.h:32

Set suspension stiffness.  the suspension stiffness.

SetSuspension changes the stiffness of the suspension on the bike. The method will return false if the stiffness could not be adjusted.

#### Returns
true if the suspension was adjusted successfully, false otherwise.

---

{#changebreak}

#### ChangeBreak

`inline`

```cpp
template<typename BreakType> inline bool ChangeBreak(BreakType breakType)
```

Defined in src/mountainbike.h:46

Change the break type.  the break type.  the type of the break.

ChangesBreak changes the type of break fitted to the bike. The method will return false if the break type could not be fitted.

#### Returns
true if the break was adjusted successfully. false otherise

