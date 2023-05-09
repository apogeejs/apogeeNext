import * as React from "react"

export interface MenuItem {
    text: string
    action: () => void
}

export interface MenuProps {
    text: string,
    items: MenuItem[],
    //logoUrl: string
}

/** Select Menu
 * notes - I should add a property for "displayElement" and then insert the text
 * or the image depending in which is present. (I should play around with spacing.
 * As is, it wasn't intended for both, but only because spacing is funny. It will work.)
 * Additional options for label (and other) style might be good too.
 */
export function SelectMenu({text,items}: MenuProps): React.ReactElement {

    //grab a reference to clear the selection initially
    let selectRef = React.useRef<HTMLSelectElement>(null)
    React.useEffect(() => {
        if(selectRef.current !== null) {
            selectRef.current!.selectedIndex = -1
        }
    })

    function changeHandler(event: React.ChangeEvent<HTMLSelectElement>) {
        let action = items[event.currentTarget.selectedIndex].action;
        if(selectRef.current !== null) {
            selectRef.current.selectedIndex = -1
        }
        action();
    }

    return (
        <div className="selectMenu_wrapper">
            <div className="selectMenu_label">{text}</div> 
            <select ref={selectRef} onChange={changeHandler} className="selectMenu_select" >
                {items.map(item => <option key={item.text} className="selectMenu_option">{item.text}</option>)}
            </select>
        </div>
    )
}