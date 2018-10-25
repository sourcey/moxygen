# group `racingbike` {#group__racingbike}

Racing bike module contains the `RacingBike` class. Racing bikes are a special kind of bike which can go much faster on the road, with much less effort.

## Summary

 Members                        | Descriptions                                
--------------------------------|---------------------------------------------
`class `[`transport::RacingBike`](#classtransport_1_1RacingBike) | Racing bike class.

# class `transport::RacingBike` {#classtransport_1_1RacingBike}

```
class transport::RacingBike
  : public transport::Bicycle
```  

Racing bike class.

[RacingBike](#classtransport_1_1RacingBike) is a special kind of bike which can go much faster on the road, with much less effort (even uphill!). It doesn't make sense to call `RingBell` on a racing bike for they don't have bells.

## Summary

 Members                        | Descriptions                                
--------------------------------|---------------------------------------------
`public virtual void `[`PedalHarder`](#classtransport_1_1RacingBike_1ab557c5727daa07a5001782d5dcd46c5b)`()` | PedalHarder makes you go faster (usually).
`public virtual void `[`RingBell`](#classtransport_1_1RacingBike_1ad32dc3b06a453fba3e20329842bb318b)`()` | Ring bell on the bike.

## Members

#### `public virtual void `[`PedalHarder`](#classtransport_1_1RacingBike_1ab557c5727daa07a5001782d5dcd46c5b)`()` {#classtransport_1_1RacingBike_1ab557c5727daa07a5001782d5dcd46c5b}

PedalHarder makes you go faster (usually).

#### `public virtual void `[`RingBell`](#classtransport_1_1RacingBike_1ad32dc3b06a453fba3e20329842bb318b)`()` {#classtransport_1_1RacingBike_1ad32dc3b06a453fba3e20329842bb318b}

Ring bell on the bike.

RingBell rings the bell on the bike. Note that not all bikes have bells.

