const PURCHASE_WEBHOOK = "https://discord.com/api/webhooks/1455151545695080459/Yh79KZFAKIGdJ9xf0sZG5ssFpnPidW8Dh5JMnQYQ957TVDSPZHmcIGNpoTMkJ6L6xY_Z";
const COMPLAINT_WEBHOOK = "https://discord.com/api/webhooks/1455640996955291698/h3593UQNNnG4_syGS3YFSfOXjnTIfYFn3WB4gy9aZ998hTpMYcNIjAfBT4D4zn_gpuD9";
const ADMIN_LOGS_WEBHOOK = "https://discord.com/api/webhooks/1457782854560907587/BHqVtn-Q9NtS_L-rLOynSSQMYyp8m31SJ7VkhYkvxClagnBh5g5Gi4UCa-YVnl3IRwTA";

interface PurchaseData {
  orderNumber?: string;
  accountName: string;
  characterName: string;
  discordUsername: string;
  oderId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

interface RoleCreatedData {
  roleName: string;
  permissions: string[];
  createdBy: string;
}

interface PasswordResetData {
  targetUserEmail: string;
  targetUserDiscord: string;
  resetBy: string;
}

interface ComplaintData {
  complaintId?: string;
  characterName: string;
  accountName: string;
  discordUsername: string;
  complaint: string;
}

export const sendPurchaseWebhook = async (data: PurchaseData) => {
  const itemsList = data.items
    .map((item) => `• ${item.name} - الكمية: ${item.quantity} - السعر: ${item.price.toLocaleString()}`)
    .join("\n");

  const fields = [
    ...(data.orderNumber ? [{ name: "🎫 رقم الطلب", value: data.orderNumber, inline: false }] : []),
    { name: "👤 اسم الحساب", value: data.accountName, inline: true },
    { name: "🎮 اسم الشخصية", value: data.characterName, inline: true },
    { name: "💬 يوزر الديسكورد", value: data.discordUsername, inline: true },
    { name: "🆔 الايدي", value: data.oderId, inline: true },
    { name: "📦 المنتجات", value: itemsList, inline: false },
    { name: "💰 المجموع الكلي", value: `${data.total.toLocaleString()}`, inline: true },
  ];

  const embed = {
    title: "🛒 طلب شراء جديد",
    color: 0xdc2626,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Walker Family Shop",
    },
  };

  try {
    const response = await fetch(PURCHASE_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log("Purchase webhook response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("Error sending purchase webhook:", error);
    return false;
  }
};

export const sendComplaintWebhook = async (data: ComplaintData) => {
  const fields = [
    ...(data.complaintId ? [{ name: "🆔 ID الشكوى", value: data.complaintId, inline: false }] : []),
    { name: "🎮 اسم الشخصية", value: data.characterName, inline: true },
    { name: "👤 اسم الحساب", value: data.accountName, inline: true },
    { name: "💬 يوزر الديسكورد", value: data.discordUsername, inline: true },
    { name: "📋 الشكوى", value: data.complaint, inline: false },
  ];

  const embed = {
    title: "📝 شكوى جديدة",
    color: 0xfbbf24,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Walker Family Shop",
    },
  };

  try {
    const response = await fetch(COMPLAINT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log("Complaint webhook response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("Error sending complaint webhook:", error);
    return false;
  }
};

// Use the same webhook as admin activation
const ADMIN_ACTIVATION_WEBHOOK = "https://discord.com/api/webhooks/1457142786498236522/ipk_45BtgnxJc1p3UYx3FnoOE6LTbKVyjTaWJhJOZWCnNo7o3G5erqsESH0wGRiqvOmc";

export const sendRoleCreatedWebhook = async (data: RoleCreatedData) => {
  const permissionsList = data.permissions.join("، ");

  const embed = {
    title: "👑 تم إنشاء رول جديد",
    color: 0x3b82f6,
    fields: [
      { name: "📛 اسم الرول", value: data.roleName, inline: true },
      { name: "👤 بواسطة", value: data.createdBy, inline: true },
      { name: "🔐 الصلاحيات", value: permissionsList || "لا توجد", inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Walker Family Shop - Admin Logs",
    },
  };

  try {
    const response = await fetch(ADMIN_ACTIVATION_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log("Role created webhook response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("Error sending role created webhook:", error);
    return false;
  }
};

export const sendPasswordResetWebhook = async (data: PasswordResetData) => {
  const embed = {
    title: "🔑 تم تغيير كلمة السر",
    color: 0xf59e0b,
    fields: [
      { name: "📧 الإيميل", value: data.targetUserEmail, inline: true },
      { name: "💬 ديسكورد", value: data.targetUserDiscord, inline: true },
      { name: "👤 بواسطة", value: data.resetBy, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Walker Family Shop - Admin Logs",
    },
  };

  try {
    const response = await fetch(ADMIN_LOGS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log("Password reset webhook response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("Error sending password reset webhook:", error);
    return false;
  }
};
