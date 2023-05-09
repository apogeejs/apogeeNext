import * as React from "react"
import {SelectMenu, MenuProps} from "./SelectMenu"


export interface MenuBarProps {
    menuList: MenuProps[]
}

/** This file contains the MenuBar element for the apogee app. Embedded in it are the menu commands that run the application. 
 * activeTabName, activeTabIcon and activeTabStatus display the current tab. They are all optional. MenueData is required. */
export function MenuBar({menuList}: MenuBarProps) {

    /*let logoUrl = apogeeui.uiutil.getResourcePath("/shortlogo16.png","app")*/

    // We add elements depending on platform
    // - mac: use native title bar
    // - windows: use custom title bar with native controls overlay
    // - other: use custom title bar and custom controls 
    let mainData = window.electronAPI.getMainData()
    let makeDraggable = mainData !== undefined ? mainData.isWindows || mainData.isOther : true
    let useControls = mainData !== undefined ? mainData.isOther : false

    return (
        <div className="menu_bar">
            <div className="menu_bar_left">
                {/*<img src={logoUrl} className="menu_bar_icon" />*/}
                {menuList.map(menuData => <SelectMenu key={menuData.text} text={menuData.text} items={menuData.items}/>)}
            </div>
            { makeDraggable ? <DraggableWindowHeader></DraggableWindowHeader> : "" }
            { useControls ? <div className="menu_bar_right">
                  <WindowControls></WindowControls>
              </div> : 
              "" 
            }
        </div>
        
    )
}

const DraggableWindowHeader: React.FC = () => {
  const headerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let isDragging = false;
    let startMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startMousePosition.x;
      const deltaY = e.clientY - startMousePosition.y;
      //window.moveTo(window.screenX + deltaX, window.screenY + deltaY);
      window.electronAPI.setPosition(window.screenX + deltaX, window.screenY + deltaY);
    };

    const headerElement = headerRef.current;
    if (headerElement) {
      headerElement.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (headerElement) {
        headerElement.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={headerRef} className="menu_bar_center">&nbsp;</div>
  );
};


const WindowControls = () => {
  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.toggleMaximizeWindow();
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="window-controls">
      <button className="window-control minimize" onClick={handleMinimize}>
        <span className="icon">−</span>
      </button>
      <button className="window-control maximize" onClick={handleMaximize}>
        <span className="icon">□</span>
      </button>
      <button className="window-control close" onClick={handleClose}>
        <span className="icon">×</span>
      </button>
    </div>
  );
};



