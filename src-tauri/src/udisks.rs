// udisks.rs
use std::collections::HashMap;
use zbus::proxy;
use zbus::zvariant::Value;
use zbus::zvariant::{OwnedObjectPath, OwnedValue};

// Interface genérica que lista TODOS os objetos gerenciados pelo udisks2
// (drives, blocks/partições, filesystems, tudo junto)
#[proxy(
    interface = "org.freedesktop.DBus.ObjectManager",
    default_service = "org.freedesktop.UDisks2",
    default_path = "/org/freedesktop/UDisks2"
)]
pub trait ObjectManager {
    fn get_managed_objects(
        &self,
    ) -> zbus::Result<HashMap<OwnedObjectPath, HashMap<String, HashMap<String, OwnedValue>>>>;

    // sinais de hotplug
    #[zbus(signal)]
    fn interfaces_added(
        &self,
        object_path: OwnedObjectPath,
        interfaces: HashMap<String, HashMap<String, OwnedValue>>,
    );

    #[zbus(signal)]
    fn interfaces_removed(&self, object_path: OwnedObjectPath, interfaces: Vec<String>);
}

// Representa um disco físico (HD, SSD, pendrive)
#[proxy(
    interface = "org.freedesktop.UDisks2.Drive",
    default_service = "org.freedesktop.UDisks2"
)]
pub trait Drive {
    #[zbus(property)]
    fn model(&self) -> zbus::Result<String>;
    #[zbus(property)]
    fn vendor(&self) -> zbus::Result<String>;
    #[zbus(property)]
    fn size(&self) -> zbus::Result<u64>;
    #[zbus(property)]
    fn removable(&self) -> zbus::Result<bool>;
    #[zbus(property, name = "RotationRate")]
    fn rotation_rate(&self) -> zbus::Result<i32>; // 0 = SSD/NVMe, >0 = HDD, -1 = desconhecido
    #[zbus(property)]
    fn connection_bus(&self) -> zbus::Result<String>; // "usb", "sata", "nvme"...
    fn eject(&self, options: HashMap<&str, &Value<'_>>) -> zbus::Result<()>;
}

// Representa uma partição/bloco dentro de um drive
#[proxy(
    interface = "org.freedesktop.UDisks2.Block",
    default_service = "org.freedesktop.UDisks2"
)]
pub trait Block {
    #[zbus(property)]
    fn drive(&self) -> zbus::Result<OwnedObjectPath>;
    #[zbus(property)]
    fn id_label(&self) -> zbus::Result<String>;
    #[zbus(property, name = "IdUUID")]
    fn id_uuid(&self) -> zbus::Result<String>;
    #[zbus(property)]
    fn id_type(&self) -> zbus::Result<String>; // ext4, ntfs, vfat...
}

// Info de montagem (só existe se a partição estiver montada)
#[proxy(
    interface = "org.freedesktop.UDisks2.Filesystem",
    default_service = "org.freedesktop.UDisks2"
)]
pub trait Filesystem {
    #[zbus(property)]
    fn mount_points(&self) -> zbus::Result<Vec<Vec<u8>>>; // vem como bytes (paths C-string)

    fn mount(&self, options: HashMap<&str, &Value<'_>>) -> zbus::Result<String>;
    fn unmount(&self, options: HashMap<&str, &Value<'_>>) -> zbus::Result<()>;
}
