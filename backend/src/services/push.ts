import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { env, isTest } from "../config/env";
import { logger } from "../config/logger";
import { DeviceToken } from "../models";

let expo: Expo | null = null;

export interface PushPayload {
  title: string;
  body: string;
  /** Read by the mobile app to deep-link, e.g. { screen: "order", id }. */
  data?: Record<string, unknown>;
}

export const sentPush: { userId: string; payload: PushPayload }[] = [];

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (isTest) {
    sentPush.push({ userId, payload });
    return;
  }
  const devices = await DeviceToken.find({ user: userId }).select("token").lean();
  const tokens = devices.map((d) => d.token).filter((t) => Expo.isExpoPushToken(t));
  if (!tokens.length) return;

  expo ??= new Expo(env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {});
  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    channelId: "orders",
  }));

  const dead: string[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.forEach((ticket, i) => {
      if (ticket.status === "error") {
        if (ticket.details?.error === "DeviceNotRegistered") dead.push(String(chunk[i]?.to));
        else logger.warn({ ticket }, "Push ticket error");
      }
    });
  }
  // Uninstalled apps: forget their tokens.
  if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } });
}
