#include "widget.h"

namespace demo {

Widget::Widget() = default;

int Widget::size() const
{
    return 1;
}

Widget createWidget()
{
    return Widget{};
}

} // namespace demo
