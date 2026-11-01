import { z } from "zod";

const logSection = (title) => console.log(`\n${"=".repeat(50)}\n=== ${title} ===\n${"=".repeat(50)}`);

logSection("1. СОЗДАНИЕ СХЕМЫ (Инициализация)");

//создаю схему. внутри Zod будет создавать $ZodObject, $ZodString, $ZodCheckMinLength и прочее
const UserSchema = z.object({
  name: z.string().min(3, "Имя должно быть не короче 3 символов"),
  age: z.number().max(100, "Слишком большой возраст"),
});

//смотрим внутрь схемы (официальное свойство _zod для интроспекции)
const nameSchema = UserSchema.shape.name;
const ageSchema = UserSchema.shape.age;

console.log("Схема UserSchema создана.");
console.log(`Тип корневой схемы: ${UserSchema._zod.def.type}`); //object
console.log(`Тип схемы поля name: ${nameSchema._zod.def.type}`); //string

//показываем, что проверки (checks) прикреплены к схеме, а не зашиты в класс
console.log(`\nПроверки для поля name (def.checks):`);
nameSchema._zod.def.checks.forEach((check, idx) => {
  console.log(`  [${idx}] Код проверки: ${check._zod.def.check}`);
});

//работа механизма onattach
//при инициализации проверка minLength прикрепляется к схеме и кладет метаданные в bag
console.log(`\nМетаданные (bag) для поля name после onattach (сбор JIT-инфо):`);
console.log(nameSchema._zod.bag);


logSection("2. ЗАПУСК ПРОВЕРКИ (safeParse -> run)");

const inputData = { name: "Al", age: 150 };
console.log("Входные данные:", inputData);

//safeParse вызывает внутренний _zod.run
//_zod.run был собран в $ZodType.init (слайд 12)
//он делает parse -> runChecks
const result = UserSchema.safeParse(inputData);


logSection("3. РАЗБОР РЕЗУЛЬТАТА (Payload и Issues)");

console.log("Успешно?", result.success);

if (!result.success) {
  //result.error - это $ZodError, внутри он содержит массив issues
  //каждый issue - это объект, сформированный в payload.issues
  console.log("\nНайденные ошибки (issues):");
  result.error.issues.forEach((issue, idx) => {
    console.log(`  [${idx}]`);
    console.log(`    Путь (path): ${issue.path.join(".")}`);
    console.log(`    Код (code): ${issue.code}`);
    console.log(`    Сообщение (message): ${issue.message}`);
    console.log(`    Значение (input): ${JSON.stringify(issue.input)}`);
    //continue: true означает, что проверки не остановились (abort: false)
    console.log(`    Продолжать проверки (continue): ${issue.continue}`);
  });
}

logSection("4. ДЕМОНСТРАЦИЯ ASYNC-КОНВЕЙЕРА (Слайд 12)");

//Zod поддерживает асинхронные проверки (refine)
//если в синхронном safeParse попадается async проверка, Zod кидает $ZodAsyncError
const asyncSchema = z.string().refine(async (val) => val.length > 3, {
  message: "Слишком короткая строка (async)",
});

console.log("Создана схема с асинхронной проверкой.");
try {
  //safeParse - синхронный, поэтому он упадет, если внутри есть async проверка
  asyncSchema.safeParse("ab");
} catch (e) {
  console.log(`\nПерехвачено исключение: ${e.name}`);
  console.log(`Сообщение: ${e.message}`);
}

//чтобы асинхронные проверки работали, используется parseAsync
console.log("\nИспользование parseAsync для поддержки асинхронности:");
const asyncResult = await asyncSchema.safeParseAsync("ab");
if (!asyncResult.success) {
  console.log("Результат safeParseAsync:", asyncResult.error.issues[0].message);
}

logSection("5. JIT-ОПТИМИЗАЦИЯ И FAST-PASS (Слайд 14)");

//на слайде 14 у меня fastpass (JIT)
//при повторном вызове safeParse с той же схемой, 
//Zod использует скомпилированный код, чтобы быстрее пробегать по полям объекта.
console.log("Вызов safeParse во второй раз (включается JIT fastpass)...");
const result2 = UserSchema.safeParse({ name: "Alice", age: 25 });
console.log("Успешно?", result2.success);
console.log("Данные после валидации (если бы это был parse, вернулся бы клон):", result2.data);