//go:build windows

package collector

import _ "embed"

// TrayIconData 包含托盘图标的 ICO 数据
// 需要将 tray-icon.ico 放到此目录
//
//go:embed tray-icon.ico
var TrayIconData []byte
