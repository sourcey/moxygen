# group `mountainbike` {#group__mountainbike}

Mountain bike module contains the `MountainBike` class. Mountain bikes are a kind of bike for cycling on rough terrain.

## Summary

 Members                        | Descriptions                                
--------------------------------|---------------------------------------------
`class `[`transport::MountainBike`](#classtransport_1_1MountainBike) | Mountain bike implementation of a `[Bicycle](example/doc/api-bicycle.md#classtransport_1_1Bicycle)`.

# class `transport::MountainBike` {#classtransport_1_1MountainBike}

```
class transport::MountainBike
  : public transport::Bicycle
```  

Mountain bike implementation of a `[Bicycle](example/doc/api-bicycle.md#classtransport_1_1Bicycle)`.

[MountainBike](#classtransport_1_1MountainBike) is an implementation of a [Bicycle](example/doc/api-bicycle.md#classtransport_1_1Bicycle) providing a bike for cycling on rough terrain. Mountain bikes are pretty cool because they have stuff like **Suspension** (and you can even adjust it using SetSuspension). If you're looking for a bike for use on the road, you might be better off using a [RacingBike](example/doc/api-racingbike.md#classtransport_1_1RacingBike) though.

## Summary

 Members                        | Descriptions                                
--------------------------------|---------------------------------------------
`public bool `[`SetSuspension`](#classtransport_1_1MountainBike_1a04caecd7e5ff7572b6ac1dc283510301)`(double stiffness)` | Set suspension stiffness.  the suspension stiffness.
`public template<>`  <br/>`inline bool `[`ChangeBreak`](#classtransport_1_1MountainBike_1afd02513876a196e98acaacdc555aeb52)`(BreakType breakType)` | Change the break type.  the break type.  the type of the break.

## Members

#### `public bool `[`SetSuspension`](#classtransport_1_1MountainBike_1a04caecd7e5ff7572b6ac1dc283510301)`(double stiffness)` {#classtransport_1_1MountainBike_1a04caecd7e5ff7572b6ac1dc283510301}

Set suspension stiffness.  the suspension stiffness.

SetSuspension changes the stiffness of the suspension on the bike. The method will return false if the stiffness could not be adjusted.

#### Returns
true if the suspension was adjusted successfully, false otherwise.

#### `public template<>`  <br/>`inline bool `[`ChangeBreak`](#classtransport_1_1MountainBike_1afd02513876a196e98acaacdc555aeb52)`(BreakType breakType)` {#classtransport_1_1MountainBike_1afd02513876a196e98acaacdc555aeb52}

Change the break type.  the break type.  the type of the break.

ChangesBreak changes the type of break fitted to the bike. The method will return false if the break type could not be fitted.

#### Returns
true if the break was adjusted successfully. false otherise

