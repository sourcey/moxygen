#ifndef __TRANSPORT_H__
#define __TRANSPORT_H__

/** @defgroup bicycle Bycicle module
 *
 * Bicycle module contains the bicycle class. Bicycles are a useful way of
 * transporting oneself, without too much effort.
 */

#include <transport/bicycle.h>

/** @defgroup racingbike Racing bike module
 *
 * Racing bike module contains the `RacingBike` class. Racing bikes are a
 * special kind of bike which can go much faster on the road, with much less
 * effort.
 */

#include <transport/racingbike.h>

/** @defgroup mountainbike Mountain bike module
 *
 * Mountain bike module contains the `MountainBike` class. Mountain bikes are
 * a kind of bike for cycling on rough terrain.
 */

#include <transport/mountainbike.h>

/**
 * Enum class for transport types.
 *
 * This definition exists in the default namespace and is ungrouped.
 * It will *not* be displayed if the `groups` options is used.
 */
enum class TransportType {
  Bycicle, /*!< Bycicle type */
  RacingBike, /*!< Racing bike type */
  RacingBike /*!< Mountain bike type */
};

/**
 * The modifier value if pedal power is used.
 *
 * This definition exists in the default namespace and is ungrouped.
 * It will *not* be displayed if the `groups` options is used.
 */
#define PEDAL_POWER_MODIFIER 9000

#endif /* __TRANSPORT_H__ */
