# racingbike {#group__racingbike}

Racing bike module contains the `RacingBike` class. Racing bikes are a special kind of bike which can go much faster on the road, with much less effort.

### Classes

| Name | Description |
|------|-------------|
| [`RacingBike`](#classtransport_1_1RacingBike) | Racing bike class. |

## RacingBike {#classtransport_1_1RacingBike}

> **Extends:** `transport::Bicycle`
> **Defined in:** `racingbike.h`

Racing bike class.

[RacingBike](#classtransport_1_1RacingBike) is a special kind of bike which can go much faster on the road, with much less effort (even uphill!). It doesn't make sense to call `RingBell` on a racing bike for they don't have bells.

### Members

| Name | Description |
|------|-------------|
| [`PedalHarder`](#classtransport_1_1RacingBike_1ab557c5727daa07a5001782d5dcd46c5b) | PedalHarder makes you go faster (usually). |
| [`RingBell`](#classtransport_1_1RacingBike_1ad32dc3b06a453fba3e20329842bb318b) | Ring bell on the bike. |

---

#### PedalHarder {#classtransport_1_1RacingBike_1ab557c5727daa07a5001782d5dcd46c5b}

```cpp
virtual void PedalHarder()
```

PedalHarder makes you go faster (usually).

---

#### RingBell {#classtransport_1_1RacingBike_1ad32dc3b06a453fba3e20329842bb318b}

```cpp
virtual void RingBell()
```

Ring bell on the bike.

RingBell rings the bell on the bike. Note that not all bikes have bells.

