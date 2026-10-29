import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/kit";
import { Icon } from "../ui/icons";
import { api, RequestError, type Plan } from "../lib/api";
import { navigate } from "../lib/router";
import { useStore } from "../lib/store";
import { inTelegram, openLink } from "../lib/telegram";

const ru = (n: number) => n.toLocaleString("ru-RU");

export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState("");
  const session = useStore((s) => s.session);
  const notify = useStore((s) => s.notify);

  useEffect(() => {
    void (async () => {
      try {
        setPlans((await api.publicPlans()).items);
      } catch (exc) {
        notify(exc instanceof RequestError ? exc.message : "каталог не ответила", "error");
      }
    })();
  }, [notify]);

  const buy = async (code: string) => {
    setBusy(code);
    try {
      const link = await api.subscribe(code);
      if (inTelegram()) openLink(link.url);
      else notify("оплата доступна из Telegram: открой бота", "info");
    } catch (exc) {
      notify(exc instanceof RequestError ? exc.message : "платёж не стартовал", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="shell section">
      <span className="eyebrow">тарифы</span>
      <h1 className="h2">Доступ к сканеру</h1>
      <p className="lede">
        Лимит расчётов в сутки и срок подписки видны в кабинете после входа. Оплата — звёздами
        Telegram или USDT.
      </p>

      <div className="plans">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.code}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className={`plan${plan.badge ? " plan--best" : ""}`}
          >
            {plan.badge ? <span className="plan__badge">{plan.badge}</span> : null}
            <b>{plan.title}</b>
            <div className="plan__price">
              {plan.stars ? (
                <>
                  <span className="num" style={{ fontSize: 26 }}>
                    {ru(plan.stars)}
                  </span>
                  <span className="muted">⭐</span>
                </>
              ) : (
                <span className="num" style={{ fontSize: 26 }}>
                  ${plan.usdt}
                </span>
              )}
            </div>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              {plan.hint || `${plan.days} дней`}
              {plan.rub ? ` · ≈${ru(plan.rub)} ₽` : ""}
            </span>
            <Button
              variant={plan.badge ? "kill" : "plain"}
              full
              disabled={busy === plan.code}
              onClick={() => void buy(plan.code)}
            >
              {session ? "подключить" : "войти и подключить"}
            </Button>
          </motion.div>
        ))}
        {!plans.length ? <span className="skl" style={{ height: 200 }} /> : null}
      </div>

      {!session ? (
        <div className="panel pad row" style={{ justifyContent: "center" }}>
          <span className="muted" style={{ fontSize: "var(--fs-s)" }}>
            вход — через бота в Telegram
          </span>
          <Button variant="ghost" onClick={() => navigate("/kabinet")}>
            в кабинет
          </Button>
        </div>
      ) : null}

      <div className="panel pad">
        <span className="label">что входит</span>
        <ul className="why">
          <li>живое табло сканера и поток обновлений без перезагрузки</li>
          <li>разбор матча: сигнал, причины, срок актуальности, основа ставки на гол</li>
          <li>фильтры ленты и подписка на push по ним</li>
          <li>журнал ставок с разбором исходов</li>
        </ul>
        <p className="muted" style={{ fontSize: "var(--fs-xs)", margin: "var(--sp-3) 0 0" }}>
          <Icon name="alert" size={13} /> 18+. Прогнозы — аргументы, а не гарантии: ничейный исход и
          серия мимо входят в сценарий.
        </p>
      </div>
    </div>
  );
}
