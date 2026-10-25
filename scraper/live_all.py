"""Run all live-results adapters; one failure must not stop the others."""
import importlib

MODULES = ("live_serbia", "live_brazil", "live_bulgaria")


def main():
    for name in MODULES:
        print("\n==", name)
        try:
            mod = importlib.import_module(name)
            mod.main()
        except Exception as e:
            print("%s: FAILED (%s)" % (name, e))


if __name__ == "__main__":
    main()
