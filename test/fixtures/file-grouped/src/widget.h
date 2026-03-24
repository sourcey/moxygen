/// @addtogroup widget
/// @{

#pragma once

namespace demo {

/// Widget documented via file-level grouping only.
class Widget
{
public:
    /// Options nested inside Widget should still render on the class page.
    struct Options
    {
        int capacity = 0;
    };

    Widget();

    /// Returns the current widget size.
    int size() const;
};

/// Creates a default widget instance.
Widget createWidget();

} // namespace demo

/// @}
