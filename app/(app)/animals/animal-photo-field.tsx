"use client";

import { useEffect, useId, useState } from "react";
import { AnimalPhoto } from "@/app/components/animal-photo";

export function AnimalPhotoField({
  currentUrl = "",
  alt = "",
}: {
  currentUrl?: string;
  alt?: string;
}) {
  const inputId = useId();
  const [pickedName, setPickedName] = useState("");
  const [localPreview, setLocalPreview] = useState("");

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const preview = localPreview || currentUrl;

  return (
    <div className="grid gap-3 text-sm sm:col-span-2">
      <span className="font-medium">写真</span>
      {preview ? (
        <AnimalPhoto
          src={preview}
          alt={alt}
          className="max-h-56 w-full rounded-2xl object-cover"
        />
      ) : (
        <p className="text-muted">未設定。下のボタンからスマホの写真を選べます。</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label htmlFor={inputId} className="nc-btn w-full cursor-pointer sm:w-auto">
          写真を追加
        </label>
        <input
          id={inputId}
          type="file"
          name="photo"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (localPreview) URL.revokeObjectURL(localPreview);
            if (!file) {
              setPickedName("");
              setLocalPreview("");
              return;
            }
            setPickedName(file.name);
            setLocalPreview(URL.createObjectURL(file));
          }}
        />
        {currentUrl ? (
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="removePhoto" className="nc-check" />
            写真を削除する
          </label>
        ) : null}
      </div>
      {pickedName ? (
        <p className="text-sm text-muted">
          {pickedName} を選択中です。保存するとアップロードされます。
        </p>
      ) : null}
      <details className="rounded-2xl bg-sand/80 px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted">URLで指定（任意）</summary>
        <label className="mt-2 grid gap-1 text-sm">
          <span className="font-medium">写真 URL</span>
          <input
            name="photoUrl"
            type="url"
            inputMode="url"
            defaultValue={currentUrl}
            placeholder="https://"
            className="nc-input"
          />
        </label>
      </details>
    </div>
  );
}
