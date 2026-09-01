{#utility}

# Utility

```cpp
class Utility
```

Defined in src/member_kinds.h:5

Utility type with static and private members.

## Public Methods

| Return | Name | Description |
|--------|------|-------------|
| `auto` | [`modern`](#modern) `virtual` `const` `inline` `nodiscard` `constexpr` `&` `noexcept(noexcept(std::declval<T>()))` `-> int` `requires std::integral<T>` | Modern qualified member. |

---

{#modern}

### modern

`virtual` `const` `inline` `nodiscard` `constexpr` `&` `noexcept(noexcept(std::declval<T>()))` `-> int` `requires std::integral<T>`

```cpp
template<typename T> [[nodiscard]] constexpr virtual inline auto modern() const & noexcept(noexcept(std::declval<T>())) -> int requires std::integral<T>
```

Defined in src/member_kinds.h:9

Modern qualified member.

## Public Static Methods

| Return | Name | Description |
|--------|------|-------------|
| `Utility` | [`create`](#create) `static` | Creates a utility instance. |

---

{#create}

### create

`static`

```cpp
static Utility create()
```

Defined in src/member_kinds.h:8

Creates a utility instance.

## Private Attributes

| Return | Name | Description |
|--------|------|-------------|
| `int` | [`secret`](#secret)  | Private instance state. |

---

{#secret}

### secret

```cpp
int secret
```

Defined in src/member_kinds.h:12

Private instance state.

## Private Methods

| Return | Name | Description |
|--------|------|-------------|
| `void` | [`hidden`](#hidden)  | Hidden helper method. |

---

{#hidden}

### hidden

```cpp
void hidden()
```

Defined in src/member_kinds.h:11

Hidden helper method.

## Private Static Attributes

| Return | Name | Description |
|--------|------|-------------|
| `int` | [`globalSecret`](#globalsecret) `static` | Private static state. |

---

{#globalsecret}

### globalSecret

`static`

```cpp
int globalSecret
```

Defined in src/member_kinds.h:13

Private static state.

